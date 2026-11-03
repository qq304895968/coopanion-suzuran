/** Build the WebUI panel bundle. The client only imports types from cortico/*. */
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
