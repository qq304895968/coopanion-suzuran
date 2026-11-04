import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { normalizeConfig, qqDefaults, QQ_DEFAULTS, type QQConfigSection } from '../src/config.ts';
import { QQWorld } from '../src/world.ts';
import { definition } from '../src/definition.ts';
import { ProactiveSpeaker } from '../src/proactive.ts';
import { testLogger } from './helpers.ts';
import type { OneBotMessage } from '../src/types.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'qq-contract-')); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true }); });

describe('configuration identity and independent deployments', () => {
  it('keeps the live section and supplied child object identities', () => {
    const partial = { enabled: true, qzone: { enabled: true }, voice: { enabled: true } };
    const qzone = partial.qzone;
    const voice = partial.voice;
    const cfg = normalizeConfig(partial as QQConfigSection);
    expect(cfg).toBe(partial);
    expect(cfg.qzone).toBe(qzone);
    expect(cfg.voice).toBe(voice);
    expect(cfg.qzone.enabled).toBe(true);
    expect(cfg.qzone.tickSec).toBe(QQ_DEFAULTS.qzone.tickSec);
    partial.voice.enabled = false;
    expect(cfg.voice.enabled).toBe(false);
  });
  it('does not share nested defaults between deployments', () => {
    const before = structuredClone(QQ_DEFAULTS);
    const a = normalizeConfig({} as QQConfigSection);
    const b = normalizeConfig({} as QQConfigSection);
    const defaults = qqDefaults();
    a.qzone.autoReplyComments.dailyQuota = 999;
    defaults.proactive.tickSec = 999;
    expect(b.qzone.autoReplyComments.dailyQuota).toBe(before.qzone.autoReplyComments.dailyQuota);
    expect(QQ_DEFAULTS).toEqual(before);
  });
  it('repairs malformed nested objects without weakening type checking', () => {
    const cfg = normalizeConfig({ qzone: null, voice: [], routine: 12, asr: null } as unknown as QQConfigSection);
    expect(cfg.qzone).toEqual(QQ_DEFAULTS.qzone);
    expect(cfg.voice).toEqual(QQ_DEFAULTS.voice);
    expect(cfg.routine).toEqual(QQ_DEFAULTS.routine);
    expect(cfg.asr).toEqual(QQ_DEFAULTS.asr);
  });
});

describe('World API 6 contracts after extraction', () => {
  it('retains the tool names and module panels without opening a connection', () => {
    const world = new QQWorld({}, undefined, dir);
    const declared = new Set(definition.describe!.tools!.map(tool => tool.name));
    for (const tool of world.tools()) expect(declared.has(tool.name), tool.name).toBe(true);
    const web = world.webUi();
    expect(web.panels!.slice(0, 2).map(panel => panel.id)).toEqual(['general', 'roster']);
    for (const id of ['voice', 'asr', 'admin', 'events']) expect(web.panels!.some(panel => panel.id === id)).toBe(true);
    expect(web.config).toHaveLength(3);
  });
  it('reminder failures return ToolOutcome rather than unsupported raw objects', async () => {
    const tool = new QQWorld({}, undefined, dir).tools().find(tool => tool.name === 'qq_reminder')!;
    await expect(tool.handler({ action: 'add', text: '' }, {} as ToolCallContext)).resolves.toMatchObject({ failed: true, text: expect.any(String) });
    await expect(tool.handler({ action: 'cancel', id: '' }, {} as ToolCallContext)).resolves.toMatchObject({ failed: true, text: expect.any(String) });
  });
  it('routes QQ Zone notices before the generic notice handler', async () => {
    const onEvent = vi.fn();
    const world = new QQWorld({}, undefined, dir);
    // Isolated event-router harness; no start(), host, socket or sidecar is used.
    const harness = world as unknown as { host: object; qzone: { onEvent: typeof onEvent }; handleEvent(event: OneBotMessage): void };
    harness.host = {};
    harness.qzone = { onEvent };
    const event: OneBotMessage = { post_type: 'notice', notice_type: 'qzone_comment', time: 1, self_id: 999 };
    harness.handleEvent(event);
    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(event));
  });
});

describe('proactive warmup transition', () => {
  it('records first speech and subsequently uses stable probability', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T08:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const cfg = { ...QQ_DEFAULTS.proactive, enabled: true, tickSec: 5, warmupChance: 1, stableChancePerTick: 0, privateCooldownSec: 0 };
    const requestSpeech = vi.fn();
    const target = { address: 'private:42', kind: 'private' as const, label: 'fixture', name: 'fixture', qq: '42' };
    const speaker = new ProactiveSpeaker({ cfg, dataDir: dir, log: testLogger(), routine: { ...QQ_DEFAULTS.routine, enabled: false }, selfName: 'fixture', getTargets: () => [target], requestSpeech });
    speaker.start();
    try {
      await vi.advanceTimersByTimeAsync(5_000);
      expect(requestSpeech).toHaveBeenCalledTimes(1);
      const saved = JSON.parse(readFileSync(join(dir, 'proactive-state.json'), 'utf8'));
      expect(saved.states['private:42'].firstMessageSent).toBe(true);
      speaker.notifyReply(target.address);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(requestSpeech).toHaveBeenCalledTimes(1);
    } finally { speaker.stop(); }
  });
});
