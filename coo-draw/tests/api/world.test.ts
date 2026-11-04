import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PET_DRAW_DEFAULTS } from '../../src/api/config.ts';
import { fakeCtx, fakeQwen, makeWorld } from './helpers.ts';

function clock(start = '2026-10-28T08:00:00+08:00') {
  let time = new Date(start).getTime();
  return {
    now: () => new Date(time),
    advance: (ms: number) => { time += ms; },
  };
}

describe('pet_draw tool', () => {
  it('requires a subject', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl });
    const tool = world.tools()[0]!;
    const result = await tool.handler({}, fakeCtx());
    expect(result).toMatchObject({ failed: true });
    expect(fake.calls).toHaveLength(0);
  });

  it('refuses a video request without calling Qwen', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl });
    const result = await world.tools()[0]!.handler({ subject: '生成一段视频' }, fakeCtx());
    expect(typeof result === 'string' ? result : result.text).toContain('[refused]');
    expect(fake.calls).toHaveLength(0);
  });

  it('reports a missing key instead of calling Qwen', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, secret: '' });
    const result = await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());
    const outcome = typeof result === 'string' ? { text: result } : result;
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('QWEN_API_KEY');
    expect(fake.calls).toHaveLength(0);
  });

  it('returns the picture as an attachment and counts it', async () => {
    const fake = fakeQwen();
    const { world, dataDir } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 5, cooldownSeconds: 0 } });
    const result = await world.tools()[0]!.handler({ subject: '一只在草地上打滚的小狐狸' }, fakeCtx());
    const outcome = typeof result === 'string' ? { text: result, blobs: undefined } : result;

    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain('画好了');
    expect(outcome.text).toContain('512×512');
    expect(outcome.text).toContain('pet_say');
    expect(outcome.blobs).toHaveLength(1);
    expect(outcome.blobs![0]).toMatchObject({ mime: 'image/png', name: expect.stringMatching(/^pet-draw-/) });
    expect(fake.calls).toHaveLength(2);
    expect(existsSync(join(dataDir, 'pet-draw-state.json'))).toBe(true);
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.today']).toBe('1/5');
  });

  it('stops at the daily limit', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 1, cooldownSeconds: 0 } });
    const first = await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());
    expect((first as { failed?: true }).failed).toBeUndefined();

    const second = await world.tools()[0]!.handler({ subject: '一只狗' }, fakeCtx());
    const outcome = typeof second === 'string' ? { text: second } : second;
    expect(outcome.text).toContain('[skipped] quota');
    expect(fake.calls).toHaveLength(2);
  });

  it('applies the cooldown', async () => {
    const fake = fakeQwen();
    const time = clock();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { dailyLimit: 10, cooldownSeconds: 60 },
      now: time.now,
    });
    await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());

    time.advance(10_000);
    const second = await world.tools()[0]!.handler({ subject: '一只狗' }, fakeCtx());
    const cooldown = typeof second === 'string' ? { text: second } : second;
    expect(cooldown.text).toContain('[skipped] cooldown');
    expect(cooldown.text).toContain('50');

    time.advance(60_000);
    const third = await world.tools()[0]!.handler({ subject: '一只鸟' }, fakeCtx());
    expect((third as { failed?: true }).failed).toBeUndefined();
    expect(fake.calls).toHaveLength(4);
  });

  it('does not count a failed generation', async () => {
    const fake = fakeQwen({ status: 500, errorBody: { code: 'InternalError', message: 'boom' } });
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 5, cooldownSeconds: 0 } });
    const result = await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());
    const outcome = typeof result === 'string' ? { text: result } : result;
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('没画成');
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.today']).toBe('0/5');
  });

  it('reads the live config on every call', async () => {
    const fake = fakeQwen();
    const { world, cfg } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 5, cooldownSeconds: 0 } });
    cfg.style = 'pixel';
    await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as { input: { messages: Array<{ content: Array<{ text: string }> }> } };
    expect(body.input.messages[0]!.content[0]!.text).toContain('像素');
  });

  it('shows key and quota state in the WebUI, and can reset the count', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 2, cooldownSeconds: 0 } });
    await world.tools()[0]!.handler({ subject: '一只猫' }, fakeCtx());
    const ui = world.webUi!('zh');
    expect(ui.lamps?.find((lamp) => lamp.label === '千问')?.state).toBe('online');
    expect(ui.badges?.find((badge) => badge.label === '今日')?.value).toBe('1/2');
    const storage = ui.storage?.[0];
    expect(storage?.stat()).toContain('1/2');
    storage?.clear();
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.today']).toBe('0/2');
  });

  it('reports an offline lamp when no key is configured', () => {
    const { world } = makeWorld({ secret: '', cfg: { dailyLimit: 2 } });
    expect(world.webUi!('zh').lamps?.find((lamp) => lamp.label === '千问')?.state).toBe('offline');
  });
});

describe('defaults', () => {
  it('ships disabled with the crayon style', () => {
    expect(PET_DRAW_DEFAULTS.enabled).toBe(false);
    expect(PET_DRAW_DEFAULTS.style).toBe('crayon');
    expect(PET_DRAW_DEFAULTS.dailyLimit).toBeGreaterThan(0);
  });
});
