/**
 * 真网络冒烟：从 QWEN_API_KEY 读 Key，画一张样例，写到 smoke.<ext>。
 * 不打印 Key；只用于开发期手动验证。`QWEN_API_KEY=... pnpm smoke`
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PET_DRAW_DEFAULTS } from '../src/config.ts';
import { drawWithQwen } from '../src/draw.ts';
import { buildPrompt, negativeFor } from '../src/style.ts';

async function main(): Promise<void> {
  const apiKey = (process.env.QWEN_API_KEY ?? '').trim();
  if (!apiKey) {
    console.error('QWEN_API_KEY is not set. Run: QWEN_API_KEY=sk-... pnpm smoke');
    process.exitCode = 1;
    return;
  }
  const cfg = { ...PET_DRAW_DEFAULTS };
  const subject = '一只在草地上打滚的小狐狸';
  const started = Date.now();
  try {
    const result = await drawWithQwen({
      apiKey,
      prompt: buildPrompt(subject, cfg, '认真、温柔、有点害羞'),
      negativePrompt: negativeFor(cfg),
      count: 1,
    });
    const image = result.images[0]!;
    const target = resolve(process.cwd(), `smoke.${image.mime === 'image/png' ? 'png' : image.mime === 'image/webp' ? 'webp' : 'jpg'}`);
    writeFileSync(target, image.bytes);
    console.log(`ok: ${target} ${image.width}x${image.height} ${Math.round(image.bytes.byteLength / 1024)} KB in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    if (result.requestId) console.log(`request_id: ${result.requestId}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
