import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ensureDir, readJson, writeJsonAtomic } from './fs-util.ts';
import { builtinPresets, validateApiWorkflow } from './workflow.ts';
import type { ParamMapping, WorkflowPreset, WorkflowSummary } from './types.ts';

function summary(preset: WorkflowPreset): WorkflowSummary {
  return {
    id: preset.id,
    name: preset.name,
    builtin: preset.builtin,
    kind: preset.kind,
    created_at: preset.created_at,
    ...(preset.source ? { source: preset.source } : {}),
    ...(preset.warnings?.length ? { warnings: preset.warnings } : {}),
    mapping_count: preset.param_mapping.length,
  };
}

export class PresetStore {
  readonly dir: string;
  private imported: WorkflowPreset[] = [];

  constructor(dataDir: string) {
    this.dir = join(dataDir, 'coo-gen', 'workflows');
    ensureDir(this.dir);
    this.load();
  }

  private load(): void {
    let files: string[] = [];
    try {
      files = readdirSync(this.dir).filter((name) => name.endsWith('.json'));
    } catch {
      return;
    }
    for (const file of files) {
      const raw = readJson<unknown>(join(this.dir, file));
      if (!raw || typeof raw !== 'object') continue;
      const preset = raw as Partial<WorkflowPreset>;
      if (typeof preset.id !== 'string' || typeof preset.name !== 'string') continue;
      const checked = validateApiWorkflow(preset.workflow);
      if ('error' in checked) continue;
      this.imported.push({
        id: preset.id,
        name: preset.name,
        builtin: false,
        kind: 'imported',
        workflow: checked.workflow,
        param_mapping: Array.isArray(preset.param_mapping) ? preset.param_mapping as ParamMapping[] : [],
        created_at: Number(preset.created_at) || Date.now(),
        ...(typeof preset.source === 'string' ? { source: preset.source } : {}),
        ...(Array.isArray(preset.warnings) ? { warnings: preset.warnings.filter((item): item is string => typeof item === 'string') } : {}),
      });
    }
    this.imported.sort((a, b) => b.created_at - a.created_at);
  }

  list(): WorkflowPreset[] {
    return [...builtinPresets(), ...this.imported];
  }

  summaries(): WorkflowSummary[] {
    return this.list().map(summary);
  }

  get(id: string): WorkflowPreset | undefined {
    return this.list().find((preset) => preset.id === id);
  }

  add(input: {
    name: string;
    workflow: Record<string, unknown>;
    mapping: ParamMapping[];
    source?: string;
    warnings?: string[];
  }): WorkflowPreset {
    const id = `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const preset: WorkflowPreset = {
      id,
      name: input.name.trim().slice(0, 120) || '导入的工作流',
      builtin: false,
      kind: 'imported',
      workflow: input.workflow,
      param_mapping: input.mapping,
      created_at: Date.now(),
      ...(input.source ? { source: input.source } : {}),
      ...(input.warnings?.length ? { warnings: input.warnings } : {}),
    };
    writeJsonAtomic(join(this.dir, `${id}.json`), preset);
    this.imported.unshift(preset);
    return preset;
  }

  remove(id: string): boolean {
    if (builtinPresets().some((preset) => preset.id === id)) return false;
    const index = this.imported.findIndex((preset) => preset.id === id);
    if (index < 0) return false;
    const file = join(this.dir, `${id}.json`);
    const resolved = resolve(file);
    if (!resolved.startsWith(resolve(this.dir))) return false;
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {
      return false;
    }
    this.imported.splice(index, 1);
    return true;
  }

  /** 从本机文件读入 ComfyUI 导出的 JSON；调用方负责 UI→API 转换。 */
  readFile(file: string): unknown {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  }
}
