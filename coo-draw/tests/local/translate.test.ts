import { describe, expect, it, vi } from 'vitest';
import { composePrompt, dictionaryTranslate, selectLorasWithLlm, translatePrompt } from '../../src/local/translate.ts';
import { BUILTIN_DICTIONARY } from '../../src/local/settings.ts';

describe('提示词翻译', () => {
  it('词典精确命中优先', () => {
    expect(dictionaryTranslate('塞尔达', BUILTIN_DICTIONARY).text).toContain('princess zelda');
    expect(dictionaryTranslate('初音未来', BUILTIN_DICTIONARY).text).toContain('hatsune miku');
  });

  it('词典包含命中会拼接多个条目，长词优先', () => {
    const result = dictionaryTranslate('画一张海边日落', BUILTIN_DICTIONARY);
    expect(result.text).toContain('seaside');
    expect(result.hits).toContain('海边日落');
  });

  it('词典命中就不调用 LLM', async () => {
    const fetchImpl = vi.fn();
    const result = await translatePrompt('塞尔达', undefined, [], {
      dictionary: BUILTIN_DICTIONARY,
      url: 'http://127.0.0.1:11434/v1',
      model: 'qwen',
      fetchImpl,
    });
    expect(result.source).toBe('dictionary');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('词典未覆盖时调用 OpenAI 兼容端点', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '```\ncyberpunk cat, neon, night\n```' } }],
    }), { status: 200 }));
    const result = await translatePrompt('赛博朋克风的猫', undefined, [], {
      dictionary: {},
      url: 'http://127.0.0.1:11434/v1/',
      model: 'qwen',
      apiKey: 'k',
      fetchImpl,
    });
    expect(result.source).toBe('llm');
    expect(result.body).toBe('cyberpunk cat, neon, night');
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect((call[1].headers as Record<string, string>).authorization).toBe('Bearer k');
  });

  it('LLM 失败时原文直出并给出提醒', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }));
    const result = await translatePrompt('一只奇怪的生物', undefined, [], {
      dictionary: {},
      url: 'http://x/v1',
      model: 'm',
      fetchImpl,
    });
    expect(result.source).toBe('raw');
    expect(result.body).toBe('一只奇怪的生物');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('composePrompt 去重并保持顺序', () => {
    expect(composePrompt('masterpiece, best quality', 'best quality, cat', 'cat, 8k')).toBe('masterpiece, best quality, cat, 8k');
  });

  it('LLM 兜底挑 LoRA 并解析 JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"selected":[{"name":"cyberpunk_neon","weight":0.8,"reason":"霓虹"}]}\n```' } }],
    }), { status: 200 }));
    const picks = await selectLorasWithLlm('赛博朋克风的猫', [
      { path: '风格/cyberpunk_neon.safetensors', name: 'cyberpunk_neon', aliases: [], trigger_words: ['neon'] },
      { path: '角色/cat.safetensors', name: 'cat' },
    ], { dictionary: {}, url: 'http://x/v1', model: 'm', fetchImpl });
    expect(picks).toEqual([{ name: 'cyberpunk_neon', weight: 0.8, reason: '霓虹' }]);
  });

  it('LLM 挑 LoRA 失败时返回空数组', async () => {
    const picks = await selectLorasWithLlm('x', [{ path: 'a', name: 'a' }], {
      dictionary: {},
      url: 'http://x/v1',
      model: 'm',
      fetchImpl: (async () => new Response('bad', { status: 500 })) as typeof fetch,
    });
    expect(picks).toEqual([]);
  });
});
