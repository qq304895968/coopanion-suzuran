/** Shared, side-effect-free preview CLI parsing. No default points at a real deployment. */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { DrawConfigSection } from '../src/config.ts';

export function previewOptions(kind: 'persona-samples' | 'reference-retry', args = process.argv.slice(2), env = process.env) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    config: { type: 'string' }, output: { type: 'string' }, reference: { type: 'string' },
    denoise: { type: 'string' }, run: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (positionals.length > (kind === 'reference-retry' ? 2 : 0)) throw new Error('Unexpected positional argument');
  if (kind === 'persona-samples' && (values.reference || values.denoise)) throw new Error('--reference / --denoise are only for reference-img2img.ts');
  const configInput = values.config ?? env.COOPANION_CONFIG ?? (env.COOPANION_HOME ? join(env.COOPANION_HOME, 'config.json') : undefined);
  const config = configInput ? resolve(configInput) : undefined;
  const output = resolve(values.output ?? env.COOPANION_PREVIEW_DIR ?? fileURLToPath(new URL(`../.preview/${kind}`, import.meta.url)));
  const reference = resolve(values.reference ?? positionals[0] ?? join(output, 'ref-512.png'));
  const rawDenoise = values.denoise ?? positionals[1];
  const denoise = rawDenoise === undefined ? undefined : Number(rawDenoise);
  if (denoise !== undefined && (!Number.isFinite(denoise) || denoise <= 0 || denoise > 1)) throw new Error('--denoise must be > 0 and <= 1');
  const run = values.run === true;
  if (run && !values.help) {
    if (!config) throw new Error('--run requires --config (or COOPANION_CONFIG / COOPANION_HOME)');
    if (!statSync(config).isFile()) throw new Error('Config is not a regular file');
    if (kind === 'reference-retry' && !statSync(reference).isFile()) throw new Error('Reference is not a regular file');
  }
  return { config, output, reference, denoise, run, help: values.help === true, botDir: config ? dirname(config) : fileURLToPath(new URL('../', import.meta.url)) };
}

export function loadPreviewConfig(options: ReturnType<typeof previewOptions>): { worlds?: Record<string, Partial<DrawConfigSection>> } {
  if (!options.config) return {};
  const config: unknown = JSON.parse(readFileSync(options.config, 'utf8').replace(/^\uFEFF/, ''));
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Config must be a JSON object');
  return config;
}

export const PREVIEW_USAGE = 'Options: --config <config.json> --output <preview directory> [--run]\nReference preview: [--reference <image>] [--denoise <0..1>]\nDefault is read-only: no API requests, processes, or output files. --run uses the configured local ComfyUI.';
