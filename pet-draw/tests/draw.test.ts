import { describe, expect, it } from 'vitest';
import {
  QwenDrawError,
  detectImageMime,
  drawWithQwen,
  imageSize,
  isAllowedImageHost,
  safeMessage,
} from '../src/draw.ts';
import { fakeQwen, gifBytes, jpegBytes, pngBytes } from './helpers.ts';

const base = {
  apiKey: 'sk-test-key',
  prompt: '一个小朋友用蜡笔画的太阳和小房子',
  negativePrompt: '照片, 高清, 文字',
};

describe('Qwen request', () => {
  it('posts to the synchronous image endpoint with a fixed model and 512x512', async () => {
    const fake = fakeQwen();
    const result = await drawWithQwen({ ...base, fetchImpl: fake.fetchImpl });

    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[0]!.url).toBe('https://maas.qianwenaiapi.com/api/v1/services/aigc/multimodal-generation/generation');
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as {
      model: string;
      input: { messages: Array<{ content: Array<{ text: string }> }> };
      parameters: Record<string, unknown>;
    };
    expect(body.model).toBe('qwen-image-3.0');
    expect(body.parameters).toMatchObject({
      size: '512*512',
      n: 1,
      prompt_extend: false,
      watermark: false,
      negative_prompt: base.negativePrompt,
    });
    expect(body.input.messages[0]!.content[0]!.text).toBe(base.prompt);
    expect(fake.calls[0]!.init?.headers).toMatchObject({ Authorization: 'Bearer sk-test-key' });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]!.mime).toBe('image/png');
    expect(result.images[0]!.width).toBe(512);
    expect(result.images[0]!.height).toBe(512);
    expect(result.images[0]!.fileName).toMatch(/^pet-draw-.*\.png$/);
    expect(result.requestId).toBe('req-1');
  });

  it('sends a reference image as an image part before the prompt', async () => {
    const fake = fakeQwen();
    await drawWithQwen({
      ...base,
      reference: { bytes: pngBytes(64, 64), mime: 'image/png' },
      fetchImpl: fake.fetchImpl,
    });
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as {
      input: { messages: Array<{ content: Array<{ text?: string; image?: string }> }> };
    };
    const content = body.input.messages[0]!.content;
    expect(content[0]!.image).toMatch(/^data:image\/png;base64,/);
    expect(content[1]!.text).toBe(base.prompt);
  });

  it('uses the real bytes, not the URL extension, for the MIME type', async () => {
    const fake = fakeQwen({ bytes: jpegBytes() });
    const result = await drawWithQwen({ ...base, fetchImpl: fake.fetchImpl });
    expect(result.images[0]!.mime).toBe('image/jpeg');
    expect(result.images[0]!.fileName).toMatch(/\.jpg$/);
  });

  it('asks for the requested number and returns every image', async () => {
    const fake = fakeQwen();
    const result = await drawWithQwen({ ...base, count: 3, fetchImpl: fake.fetchImpl });
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as { parameters: { n: number } };
    expect(body.parameters.n).toBe(3);
    expect(result.images).toHaveLength(3);
    expect(new Set(result.images.map((image) => image.fileName)).size).toBe(3);
    expect(fake.calls).toHaveLength(4);
  });

  it('caps the request at four images', async () => {
    const fake = fakeQwen();
    await drawWithQwen({ ...base, count: 9, fetchImpl: fake.fetchImpl });
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as { parameters: { n: number } };
    expect(body.parameters.n).toBe(4);
  });
});

describe('size and format enforcement', () => {
  it('discards a result whose reported usage is above 512', async () => {
    const fake = fakeQwen({ usage: { output_width: 768, output_height: 768 } });
    await expect(drawWithQwen({ ...base, fetchImpl: fake.fetchImpl })).rejects.toMatchObject({ code: 'too-large' });
  });

  it('discards an actual image larger than 512', async () => {
    const fake = fakeQwen({ bytes: pngBytes(1024, 1024) });
    await expect(drawWithQwen({ ...base, fetchImpl: fake.fetchImpl })).rejects.toMatchObject({ code: 'too-large' });
  });

  it('rejects GIF and unknown formats', async () => {
    const fake = fakeQwen({ bytes: gifBytes() });
    await expect(drawWithQwen({ ...base, fetchImpl: fake.fetchImpl })).rejects.toMatchObject({ code: 'unsupported-format' });
  });

  it('rejects an image URL outside the allowed Qwen/OSS hosts', async () => {
    const fake = fakeQwen({ imageUrl: 'https://evil.example.com/draw.png' });
    await expect(drawWithQwen({ ...base, fetchImpl: fake.fetchImpl })).rejects.toMatchObject({ code: 'bad-response' });
  });
});

describe('errors', () => {
  it('turns an auth failure into a safe message without the key', async () => {
    const fake = fakeQwen({
      status: 401,
      errorBody: { code: 'InvalidApiKey', message: 'bad key sk-test-key', request_id: 'req-auth' },
      requestId: 'req-auth',
    });
    try {
      await drawWithQwen({ ...base, fetchImpl: fake.fetchImpl });
      throw new Error('expected a rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(QwenDrawError);
      const drawError = error as QwenDrawError;
      expect(drawError.code).toBe('auth');
      expect(drawError.message).not.toContain('sk-test-key');
      expect(drawError.opts.requestId).toBe('req-auth');
    }
  });

  it('stops when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return new Response('{}');
    }) as typeof fetch;
    await expect(drawWithQwen({ ...base, fetchImpl, signal: controller.signal }))
      .rejects.toMatchObject({ code: 'aborted' });
  });

  it('redacts key-like strings', () => {
    expect(safeMessage('Authorization: Bearer sk-ws-abc.def')).not.toContain('sk-ws-abc.def');
  });
});

describe('image parsing', () => {
  it('reads PNG and JPEG dimensions', () => {
    expect(imageSize(pngBytes(512, 384))).toEqual({ width: 512, height: 384 });
    expect(imageSize(jpegBytes(320, 240))).toEqual({ width: 320, height: 240 });
  });

  it('detects the three accepted formats', () => {
    expect(detectImageMime(pngBytes())).toBe('image/png');
    expect(detectImageMime(jpegBytes())).toBe('image/jpeg');
    expect(detectImageMime(new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]))).toBe('image/webp');
    expect(detectImageMime(gifBytes())).toBeNull();
  });

  it('allows only Qwen/OSS hosts', () => {
    expect(isAllowedImageHost('dashscope-result.oss-accelerate.aliyuncs.com')).toBe(true);
    expect(isAllowedImageHost('dashscope.aliyuncs.com')).toBe(true);
    expect(isAllowedImageHost('aliyuncs.com.evil.com')).toBe(false);
    expect(isAllowedImageHost('evil.com')).toBe(false);
  });
});
