/** Build to the resource URL declared by the manifest, without a local host install. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
await build({
  absWorkingDir: root,
  entryPoints: ['src/webui/client.ts'],
  outfile: manifest.cortico.webUiClient,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  logLevel: 'info',
});
