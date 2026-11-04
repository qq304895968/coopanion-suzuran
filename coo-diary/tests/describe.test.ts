import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportDescribe } from 'cortico/extensions/describe-export.ts';
import { DIARY } from '../src/definition.ts';

const packageDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

describe('自描述', () => {
  it('describe.json 与代码里的声明一致', async () => {
    const scratchDir = mkdtempSync(join(tmpdir(), 'coo-diary-describe-'));
    try {
      const expected = await exportDescribe('world', DIARY, { scratchDir, packageDir, repoRoot: packageDir, language: 'en' });
      expect(readFileSync(join(packageDir, 'describe.json'), 'utf8')).toBe(`${JSON.stringify(expected, null, 2)}\n`);
    } finally {
      rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('manifest 声明了 World 类别与自描述文件', () => {
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as Record<string, any>;
    expect(pkg.cortico.kind).toBe('world');
    expect(pkg.cortico.api).toBe(6);
    expect(pkg.cortico.describe).toBe('describe.json');
    expect(pkg.keywords).toContain('cortico-world');
    expect(pkg.files).toContain('describe.json');
    expect(pkg.type).toBe('module');
  });
});
