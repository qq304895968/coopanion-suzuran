import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EventEnvelope, ToolCallContext, ToolOutcome } from 'cortico/core/types.ts';
import { EMOTE_PICS_DEFAULTS } from '../src/config.ts';
import { EmotePicsWorld, emotionFromMood, scriptMoodFromEvent } from '../src/world.ts';
import { imageDataUrl } from '../src/popup.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'emote-review-')); mkdirSync(join(dir, 'happy')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const fixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jm1sAAAAASUVORK5CYII=', 'base64');
function setup(patch = {}) {
  let now = 100_000;
  const cfg = { ...EMOTE_PICS_DEFAULTS, enabled: true, dir, chance: 1, cooldownSeconds: 30, popupEnabled: false, autoPopup: false, ...patch };
  const world = new EmotePicsWorld({ cfg, persist: () => {}, now: () => now, random: () => 0 });
  const pick = async (args: Record<string, unknown> = {}) => await world.tools().find(t => t.name === 'emote_pic')!.handler({ emotion: 'happy', ...args }, {} as ToolCallContext) as ToolOutcome;
  return { cfg, world, pick, advance: () => { now += 30_001; } };
}

describe('emote selection without a desktop host', () => {
  it('attaches valid pictures, respects cooldown and accepts explicit force', async () => {
    writeFileSync(join(dir, 'happy', 'one.png'), fixture);
    const { pick, advance } = setup();
    expect((await pick()).blobs?.[0]).toMatchObject({ mime: 'image/png' });
    expect((await pick()).text).toContain('cooldown');
    expect((await pick({ force: true })).blobs).toHaveLength(1);
    advance();
    expect((await pick()).blobs).toHaveLength(1);
  });

  it('probability zero is a deliberate skip, not an error', async () => {
    writeFileSync(join(dir, 'happy', 'one.png'), fixture);
    const result = await setup({ chance: 0 }).pick();
    expect(result.failed).toBeUndefined();
    expect(result.text).toContain('[skipped]');
    expect(result.blobs).toBeUndefined();
  });

  it('rejects unknown emotion / path traversal input', async () => {
    const result = await setup().pick({ emotion: '../../elsewhere' });
    expect(result.failed).toBe(true);
    expect(result.blobs).toBeUndefined();
  });

  it('ignores unsupported, hidden and oversized files', async () => {
    writeFileSync(join(dir, 'happy', 'not-an-image.txt'), fixture);
    writeFileSync(join(dir, 'happy', '.hidden.png'), fixture);
    writeFileSync(join(dir, 'happy', 'huge.png'), Buffer.alloc(5 * 1024 * 1024 + 1));
    expect((await setup().pick()).failed).toBe(true);
    expect(imageDataUrl(join(dir, 'happy', 'huge.png'))).toBeNull();
    expect(imageDataUrl(join(dir, 'happy', 'not-an-image.txt'))).toBeNull();
  });

  it('does not repeat the previous picture when alternatives exist', async () => {
    writeFileSync(join(dir, 'happy', 'one.png'), fixture);
    writeFileSync(join(dir, 'happy', 'two.png'), fixture);
    const { pick } = setup();
    const first = await pick({ force: true });
    const second = await pick({ force: true });
    const a = first.blobs![0];
    const b = second.blobs![0];
    if (!('bytes' in a) || !('bytes' in b)) throw new Error('Expected inline picture blobs');
    expect(a.name).not.toBe(b.name);
  });
});

describe('desktop event emotion boundary', () => {
  it('recognises canonical and localized names', () => {
    expect(emotionFromMood({ id: 'happy' })).toBe('happy');
    expect(emotionFromMood({ zh: '认真' })).toBe('determined');
    expect(emotionFromMood({ id: '../../elsewhere' })).toBeNull();
  });
  it('only responds to pet speech, not arbitrary external events', () => {
    const event = { type: 'desktop-pet.self', meta: { kind: 'say', beats: [{ mood: { id: 'happy' } }] } } as unknown as EventEnvelope;
    expect(scriptMoodFromEvent(event)).toBe('happy');
    expect(scriptMoodFromEvent({ ...event, type: 'qq.message' })).toBeNull();
    expect(scriptMoodFromEvent({ ...event, meta: { kind: 'activity' } })).toBeNull();
  });
});
