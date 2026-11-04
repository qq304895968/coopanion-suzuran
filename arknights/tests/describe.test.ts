import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { ARKNIGHTS } from '../src/definition.ts';
import { ARKNIGHTS_TOOL_DECLS, ArknightsWorld } from '../src/world.ts';

const scratchDir = mkdtempSync(join(tmpdir(), 'arknights-describe-'));
afterAll(() => rmSync(scratchDir, { recursive: true, force: true }));

const declared = JSON.parse(readFileSync(new URL('../describe.json', import.meta.url), 'utf8')) as {
  tools: Array<{ name: string; summary?: unknown }>;
  events: Array<{ type: string }>;
  prompts: Array<{ key: string; role: string; content: string }>;
};

describe('describe.json', () => {
  it('与代码里的工具、事件声明一致', () => {
    expect(declared.tools).toEqual(ARKNIGHTS.describe?.tools);
    expect(declared.events).toEqual(ARKNIGHTS.describe?.events);
  });

  it('覆盖全部工具，且每个工具都有给人看的 summary', () => {
    const names = ARKNIGHTS_TOOL_DECLS.map((decl) => decl.name).sort();
    expect(declared.tools.map((tool) => tool.name).sort()).toEqual(names);
    for (const tool of declared.tools) expect(tool.summary).toBeTruthy();
  });

  it('环境提示词与 ENV_PROMPT.md 逐字一致', () => {
    const world = ARKNIGHTS.create(fakeWorldContext(ARKNIGHTS, { scratchDir })) as ArknightsWorld;
    const docs = world.webUi('zh').promptDocs ?? [];
    const envDoc = docs.find((doc) => doc.role === 'envPrompt');
    expect(envDoc).toBeDefined();

    const source = readFileSync(envDoc!.path, 'utf8');
    const declaredPrompt = declared.prompts.find((prompt) => prompt.key === envDoc!.key);
    expect(declaredPrompt?.content).toBe(source);
  });
});
