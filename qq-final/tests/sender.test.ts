import { describe, expect, it, vi } from 'vitest';
import { QQ_DEFAULTS } from '../src/config.ts';
import { QQMessageSender, SEND_FAILED, type QQSenderContext, type QQSenderOptions } from '../src/sender.ts';
import { testLogger } from './helpers.ts';

function setup(options: QQSenderOptions = {}) {
  const callApi = vi.fn(async (_action: string, _params: Record<string, unknown>) => ({ message_id: 12 }));
  const context: QQSenderContext = {
    driver: { callApi } as unknown as QQSenderContext['driver'],
    config: { ...structuredClone(QQ_DEFAULTS), splitReplyBySentence: false, sendIntervalMs: 0 },
    log: testLogger(), emojiDirAbs: '', imageDirsAbs: [],
    voiceRuntime: () => ({} as ReturnType<QQSenderContext['voiceRuntime']>),
    convLabel: (address) => address,
    checkGroupSpeak: vi.fn(() => null), checkAntiLoop: vi.fn(() => null),
    recordGroupSpeak: vi.fn(), recordAntiLoop: vi.fn(),
    rememberSentMessage: (_address, _response, ids) => { ids?.push('12'); },
    outgoingImageTransport: () => 'path',
  };
  context.config.voice.enabled = true;
  context.config.voice.tts = true;
  const sender = new QQMessageSender(() => context, { now: () => 1000, ...options });
  return { sender, context, callApi };
}

describe('outgoing message sequencing', () => {
  it('keeps Japanese voice, Chinese text and the next reply in FIFO order', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const synthesize = vi.fn(async (_text: string) => { await gate; return { type: 'record', data: { file: 'fixture.wav' } } as const; });
    const { sender, callApi } = setup({ synthesize });
    const first = sender.send('private:1', '中文正文', undefined, undefined, true, '日本語');
    const second = sender.send('private:2', '下一条');
    await vi.waitFor(() => expect(synthesize).toHaveBeenCalled());
    expect(callApi).not.toHaveBeenCalled();
    release();
    await Promise.all([first, second]);
    expect(synthesize.mock.calls[0][0]).toBe('日本語');
    const messages = callApi.mock.calls.map(([, params]) => params.message);
    expect(messages).toEqual([
      [{ type: 'record', data: { file: 'fixture.wav' } }],
      [{ type: 'text', data: { text: '中文正文' } }],
      [{ type: 'text', data: { text: '下一条' } }],
    ]);
  });

  it('a rejected send does not poison subsequent queue entries', async () => {
    const synthesize = vi.fn().mockRejectedValueOnce(new Error('test TTS error'));
    const { sender, callApi } = setup({ synthesize });
    const first = sender.send('private:1', '失败', undefined, undefined, true);
    const rejection = expect(first).rejects.toThrow('test TTS error');
    const second = sender.send('private:1', '恢复');
    await rejection;
    await expect(second).resolves.toContain('1/1');
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it('falls back to text when synthesis returns no audio', async () => {
    const { sender, callApi } = setup({ synthesize: vi.fn(async () => null) });
    await expect(sender.send('private:1', '正文', undefined, undefined, true)).resolves.toContain('1/1');
    expect(callApi.mock.calls[0][1].message).toEqual([{ type: 'text', data: { text: '正文' } }]);
  });

  it('does not append text when legacy voice-only mode has no voice_text', async () => {
    const { sender, callApi } = setup({ synthesize: vi.fn(async () => ({ type: 'record', data: { file: 'fixture.wav' } } as const)) });
    await expect(sender.send('private:1', '台词', undefined, undefined, true)).resolves.toContain('语音 1 段');
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it('deduplicates within a conversation, not across recipients', async () => {
    const { sender, callApi } = setup();
    await sender.send('private:1', '相同文字');
    await expect(sender.send('private:1', '相同文字')).resolves.toContain('去重');
    await sender.send('private:2', '相同文字');
    expect(callApi).toHaveBeenCalledTimes(2);
  });

  it('reports failures and does not claim delivery', async () => {
    const { sender, callApi } = setup();
    callApi.mockRejectedValueOnce(new Error('offline'));
    expect((await sender.send('private:1', '内容')).startsWith(SEND_FAILED)).toBe(true);
  });

  it('honours guardrails before calling the transport', async () => {
    const { sender, context, callApi } = setup();
    context.checkGroupSpeak = () => '[send blocked] limited';
    await expect(sender.send('group:1', '内容')).resolves.toContain('[send blocked]');
    expect(callApi).not.toHaveBeenCalled();
  });
});
