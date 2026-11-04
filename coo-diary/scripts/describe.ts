/**
 * 生成 describe.json。内容来自 `src/definition.ts` 的 `describe` 与 `webUi('zh')` 声明的环境提示词原文,
 * 用的是框架的导出器 `cortico/extensions/describe-export.ts`,与 `pnpm describe:extension` 同一份逻辑。
 * 改了工具、事件或 ENV_PROMPT.md 之后重跑:`pnpm describe`。
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportDescribe } from 'cortico/extensions/describe-export.ts';
import { DIARY } from '../src/definition.ts';

const packageDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const scratchDir = mkdtempSync(join(tmpdir(), 'coo-diary-describe-'));

try {
  const describe = await exportDescribe('world', DIARY, { scratchDir, packageDir, repoRoot: packageDir, language: 'en' });
  if (!describe) throw new Error('src/definition.ts has no describe block.');
  writeFileSync(join(packageDir, 'describe.json'), `${JSON.stringify(describe, null, 2)}\n`, 'utf8');
  console.log(`Wrote describe.json: tools ${describe.tools?.length ?? 0}, events ${describe.events?.length ?? 0}, prompts ${describe.prompts?.length ?? 0}.`);
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
