import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { referenceFromFile, resolveReference } from '../../src/api/reference.ts';
import { callDraw, fakeCtx, fakeQwen, makeWorld, pngBytes } from './helpers.ts';

const dirs: string[] = [];
function dir(): string {
  const value = mkdtempSync(join(tmpdir(), 'pet-draw-ref-path-'));
  dirs.push(value);
  return value;
}
afterEach(() => {
  for (const value of dirs.splice(0)) rmSync(value, { recursive: true, force: true });
});

describe('referencePath', () => {
  it('reads an exact local image by absolute path', () => {
    const root = dir();
    const file = join(root, 'moment.png');
    writeFileSync(file, pngBytes(512, 512));
    const ref = referenceFromFile(file);
    expect(ref).toMatchObject({ source: 'file', mime: 'image/png', width: 512, height: 512 });
    expect(ref?.detail).toContain('moment.png');
  });

  it('rejects relative, missing and non-image paths', () => {
    const root = dir();
    expect(referenceFromFile('moment.png')).toBeNull();
    expect(referenceFromFile(join(root, 'missing.png'))).toBeNull();
    const text = join(root, 'note.png');
    writeFileSync(text, 'not an image');
    expect(referenceFromFile(text)).toBeNull();
  });

  it('takes priority over keyword search', async () => {
    const root = dir();
    const file = join(root, 'moment.png');
    writeFileSync(file, pngBytes(512, 512));
    const resolution = await resolveReference({
      mode: 'auto',
      name: '鲁迅',
      path: file,
      allowSearch: true,
      allowScreen: true,
      dataDir: root,
    });
    expect(resolution.ref?.source).toBe('file');
    expect(resolution.note).toContain('本地图片');
  });

  it('sends the exact image to the drawing API', async () => {
    const root = dir();
    const file = join(root, 'moment.png');
    writeFileSync(file, pngBytes(512, 512));
    const fake = fakeQwen();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { dailyLimit: 10, cooldownSeconds: 0 },
    });
    const out = await callDraw(world, '他通关时的那一幕', fakeCtx(), { referencePath: file });
    expect(out.text).toContain('参考图：本地图片');
    const call = fake.calls.find((item) => item.url.includes('/multimodal-generation/generation'));
    const body = JSON.parse(String(call!.init?.body)) as {
      input: { messages: Array<{ content: Array<{ image?: string; text?: string }> }> };
    };
    expect(body.input.messages[0]!.content[0]!.image).toMatch(/^data:image\/png;base64,/);
    expect(body.input.messages[0]!.content[1]!.text).toContain('参考图只用来认人');
  });

  it('falls back to text when the path is unreadable, without searching', async () => {
    const root = dir();
    const file = join(root, 'missing.png');
    const fake = fakeQwen();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { dailyLimit: 10, cooldownSeconds: 0 },
    });
    const out = await callDraw(world, '一只猫', fakeCtx(), { referencePath: file, referenceName: '猫' });
    expect(out.text).toContain('参考图文件没读到');
    expect(fake.calls.some((item) => item.url.includes('bing.com'))).toBe(false);
  });
});
