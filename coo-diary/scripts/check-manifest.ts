/**
 * 只核对 manifest 与默认导出:走框架自己解析 package.json 的那段代码,即 WebUI 安装前
 * `POST /api/extensions/check` 读到的东西。完整校验还需要 Cortico 源码仓库里的
 * `pnpm check:extension <dir>`,这里不做。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseExtensionManifest } from 'cortico/extensions/manifest.ts';
import { isWorldDefinition } from 'cortico/extensions.ts';

const packageDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as Record<string, unknown>;

const parsed = parseExtensionManifest(pkg, 'zh');
for (const warning of parsed.warnings) console.log(`⚠ ${warning}`);
if (!parsed.ok) {
  for (const reason of parsed.reasons) console.error(`✗ ${reason}`);
  process.exit(1);
}
console.log(`manifest ok: kind=${parsed.manifest.kind}, api=${parsed.manifest.api}, describe=${parsed.manifest.describe ?? '(none)'}`);

const entry = join(packageDir, 'src', 'index.ts');
const exported = ((await import(pathToFileURL(entry).href)) as { default?: unknown }).default;
if (!isWorldDefinition(exported)) {
  console.error('✗ the default export is not a WorldDefinition.');
  process.exit(1);
}
console.log(`default export: WorldDefinition, id=${exported.id}, tools=${exported.describe?.tools.length ?? 0}, events=${exported.describe?.events.length ?? 0}`);
