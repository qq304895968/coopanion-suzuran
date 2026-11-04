import { describe, expect, it } from 'vitest';
import {
  MAX_REFERENCE_BYTES,
  extractBingImageUrls,
  hasScreenIntent,
  publicImageUrl,
  resolveReference,
  searchReference,
  validateReference,
} from '../src/reference.ts';
import { gifBytes, pngBytes } from './helpers.ts';

describe('reference validation', () => {
  it('accepts a normal still image', () => {
    const ref = validateReference(pngBytes(512, 384), 'search', 'Bing 搜索「鲁迅」');
    expect(ref).toMatchObject({ mime: 'image/png', width: 512, height: 384, source: 'search' });
  });

  it('rejects GIF, oversized and huge-dimension images', () => {
    expect(validateReference(gifBytes(), 'search', 'x')).toBeNull();
    expect(validateReference(new Uint8Array(MAX_REFERENCE_BYTES + 1), 'search', 'x')).toBeNull();
    expect(validateReference(pngBytes(5000, 100), 'search', 'x')).toBeNull();
  });
});

describe('screen intent', () => {
  it('infers a screen reference from moment/this-look phrases', () => {
    for (const text of ['记下这一刻', '参考这一瞬间', '照着他的样子', '就现在这个画面', '用屏幕上的', '截图']) {
      expect(hasScreenIntent(text), text).toBe(true);
    }
    for (const text of ['给鲁迅画幅画', '画一个铃兰在窗边', '一只在草地上打滚的小狐狸']) {
      expect(hasScreenIntent(text), text).toBe(false);
    }
    for (const text of ['当前屏幕和聊天内容无关', '不要截图，给鲁迅画幅画', '不用屏幕，按文字画']) {
      expect(hasScreenIntent(text), text).toBe(false);
    }
  });
});

describe('search urls', () => {
  it('extracts murl entries from Bing HTML', () => {
    const html = '<a class="iusc" m="{&quot;murl&quot;:&quot;https://img.example.com/a.png&quot;,&quot;t&quot;:&quot;鲁迅 画像&quot;,&quot;purl&quot;:&quot;https://example.com/a&quot;}"></a>'
      + '<a class="iusc" m="{&quot;murl&quot;:&quot;http://img.example.com/b.png&quot;,&quot;t&quot;:&quot;其他图片&quot;,&quot;purl&quot;:&quot;https://example.com/b&quot;}"></a>';
    expect(extractBingImageUrls(html)).toEqual([
      'https://img.example.com/a.png',
      'http://img.example.com/b.png',
    ]);
  });

  it('rejects localhost/private hosts and upgrades http', () => {
    expect(publicImageUrl('http://127.0.0.1/a.png')).toBeNull();
    expect(publicImageUrl('http://10.1.2.3/a.png')).toBeNull();
    expect(publicImageUrl('http://192.168.1.2/a.png')).toBeNull();
    expect(publicImageUrl('file:///C:/a.png')).toBeNull();
    expect(publicImageUrl('http://img.example.com/a.png')?.protocol).toBe('https:');
  });
});

describe('resolveReference', () => {
  it('uses an attached image before searching', async () => {
    const attachment = validateReference(pngBytes(64, 64), 'attachment', '对话里附的参考图')!;
    const out = await resolveReference({
      mode: 'auto',
      name: '鲁迅',
      attachment,
      allowSearch: true,
      allowScreen: false,
      dataDir: 'F:\\study\\coopanion\\pet-draw\\.tmp',
    });
    expect(out.ref?.source).toBe('attachment');
    expect(out.note).toContain('对话里附的图');
  });

  it('does nothing for mode none', async () => {
    const out = await resolveReference({
      mode: 'none',
      name: '鲁迅',
      allowSearch: true,
      allowScreen: false,
      dataDir: 'F:\\study\\coopanion\\pet-draw\\.tmp',
    });
    expect(out.ref).toBeNull();
    expect(out.note).toContain('没有用参考图');
  });

  it('reports disabled search instead of pretending', async () => {
    const out = await resolveReference({
      mode: 'auto',
      name: '鲁迅',
      allowSearch: false,
      allowScreen: false,
      dataDir: 'F:\\study\\coopanion\\pet-draw\\.tmp',
    });
    expect(out.ref).toBeNull();
    expect(out.note).toContain('搜图参考已关闭');
  });
});

describe('searchReference', () => {
  it('skips ad results that do not match the query', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('bing.com/images/search')) {
        return new Response(
          '<a class="iusc" m="{&quot;murl&quot;:&quot;https://img.example.com/ad.png&quot;,&quot;t&quot;:&quot;成功男士牵手魅力甜心 立即访问&quot;,&quot;purl&quot;:&quot;https://ad.example.com/&quot;}"></a>'
          + '<a class="iusc" m="{&quot;murl&quot;:&quot;https://img.example.com/ref.png&quot;,&quot;t&quot;:&quot;鲁迅 画像&quot;,&quot;purl&quot;:&quot;https://example.com/ref&quot;}"></a>',
          { status: 200 },
        );
      }
      if (url === 'https://img.example.com/ad.png' || url === 'https://img.example.com/ref.png') {
        return new Response(pngBytes(512, 512), { status: 200, headers: { 'content-type': 'image/png' } });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const ref = await searchReference('鲁迅', fetchImpl);
    expect(ref).not.toBeNull();
    expect(calls).toContain('https://img.example.com/ref.png');
    expect(calls).not.toContain('https://img.example.com/ad.png');
  });

  it('downloads the first usable Bing result', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('bing.com/images/search')) {
        return new Response('<a class="iusc" m="{&quot;murl&quot;:&quot;https://img.example.com/ref.png&quot;,&quot;t&quot;:&quot;鲁迅 画像&quot;,&quot;purl&quot;:&quot;https://example.com/ref&quot;}"></a>', { status: 200 });
      }
      if (url === 'https://img.example.com/ref.png') {
        return new Response(pngBytes(512, 512), { status: 200, headers: { 'content-type': 'image/png' } });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const ref = await searchReference('鲁迅', fetchImpl);
    expect(ref).toMatchObject({ source: 'search', mime: 'image/png', width: 512, height: 512 });
    expect(ref?.detail).toContain('Bing 搜索「鲁迅」');
    expect(calls.some((url) => url.includes('bing.com/images/search'))).toBe(true);
  });
});
