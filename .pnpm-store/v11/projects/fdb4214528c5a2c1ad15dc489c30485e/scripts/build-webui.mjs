/**
 * Emit the browser panel to dist/webui.js.
 *
 * The client imports only types from cortico, so a single-file TypeScript
 * transpile is enough; no bundler or native binary is needed.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('src/webui/client.ts', 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    verbatimModuleSyntax: false,
    removeComments: false,
  },
  fileName: 'src/webui/client.ts',
});

mkdirSync('dist', { recursive: true });
writeFileSync('dist/webui.js', result.outputText, 'utf8');
console.log(`Wrote dist/webui.js (${result.outputText.length} bytes).`);
