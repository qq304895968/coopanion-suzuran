/** 构建 WebUI 面板 bundle；客户端只 import type cortico/*，运行时值都来自包自带。 */
import { mkdirSync } from 'node:fs';
import { build } from 'esbuild';

mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/webui/client.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/webui.js',
  logLevel: 'info',
});
