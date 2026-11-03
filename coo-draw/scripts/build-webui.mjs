/** 构建 WebUI 面板 bundle；客户端只 import type 框架类型，运行时值都来自本包。 */
import { mkdirSync } from 'node:fs';
import { build } from 'esbuild';

mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/webui/client.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: 'dist',
  entryNames: 'webui',
  assetNames: 'webui',
  logLevel: 'info',
});
