/**
 * 生成 describe.json：扩展市场与 `check:extension` 只读这个文件，不执行包代码。
 * 改过工具、事件或环境提示词后重新跑：pnpm build:describe
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ARKNIGHTS } from '../src/definition.ts';

const world = ARKNIGHTS.create({
  cfg: { ...ARKNIGHTS.defaults() },
  timezone: 'Asia/Shanghai',
  dataDir: fileURLToPath(new URL('../.tmp-describe/', import.meta.url)),
  packageDir: fileURLToPath(new URL('..', import.meta.url)),
  botDir: fileURLToPath(new URL('..', import.meta.url)),
  repoRoot: fileURLToPath(new URL('..', import.meta.url)),
  secret: () => undefined,
  storeSecret: () => {},
  persist: () => {},
  restart: () => {},
} as never);

const docs = world.webUi('zh').promptDocs ?? [];
const describe = {
  tools: ARKNIGHTS.describe?.tools ?? [],
  events: ARKNIGHTS.describe?.events ?? [],
  prompts: docs
    .filter((doc) => doc.role === 'envPrompt')
    .map((doc) => ({
      key: doc.key,
      title: doc.title,
      role: doc.role,
      content: readFileSync(doc.path, 'utf8'),
    })),
};

const out = fileURLToPath(new URL('../describe.json', import.meta.url));
writeFileSync(out, `${JSON.stringify(describe, null, 2)}\n`, 'utf8');
console.log(`wrote ${out}: ${describe.tools.length} tools, ${describe.events.length} events, ${describe.prompts.length} prompt(s)`);
