/** 把浏览器端面板打成 dist/webui.js；客户端只 import type，打包结果不依赖 cortico 运行时。 */
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
