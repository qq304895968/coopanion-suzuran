import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CooGenWorld } from '../../src/local/world.ts';
import { FakeComfy, removeDir, tempDir, testCfg } from '../local/helpers.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBUI_ROOT = resolve(HERE, '../../src/webui');

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

describe('画室 UI 架构铁律与防退化守卫', () => {
  const files = collectFiles(WEBUI_ROOT);
  const tsFiles = files.filter((f) => f.endsWith('.ts'));
  const cssContent = readFileSync(join(WEBUI_ROOT, 'style.css'), 'utf8');
  const localClient = readFileSync(join(WEBUI_ROOT, 'parts/local-client.ts'), 'utf8');
  const dropdownSrc = readFileSync(join(WEBUI_ROOT, 'parts/ui-dropdown.ts'), 'utf8');
  const clientEntry = readFileSync(join(WEBUI_ROOT, 'client.ts'), 'utf8');

  it('铁律 1：禁止在 WebUI 代码与样式中硬编码 #2ecc71、#5b8def、#4F46E5', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/#(?:2ecc71|5b8def|4f46e5)\b/i);
    }
    expect(cssContent).toContain('--coo-accent:');
    expect(cssContent).toContain('--coo-accent-soft:');
    expect(cssContent).toContain('--coo-line:');
    expect(cssContent).toContain('--coo-danger:');
  });

  it('铁律 2：左侧控件/步进器/筛选框统一 32px，右侧悬浮窗生成与取消按钮保持 40px', () => {
    expect(cssContent).toMatch(/--coo-control-h:\s*32px/);
    expect(cssContent).toMatch(/\.coo-btn-sub\s*\{[\s\S]*?height:\s*32px/);
    expect(cssContent).toMatch(/\.coo-stepper\s*\{[\s\S]*?height:\s*32px/);
    expect(cssContent).toMatch(/\.coo-form-item input,\s*\.coo-form-item \.coo-dropdown-trigger\s*\{[\s\S]*?height:\s*32px/);
    expect(cssContent).toMatch(/\.coo-action-bar \.btn\s*\{[\s\S]*?height:\s*40px/);
  });

  it('铁律 3：全局消灭原生 <select> 与 <option>，自定义 Dropdown 采用 Portal 挂载与 #F3F4F6 悬浮态', () => {
    for (const file of tsFiles) {
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/\.ui\.select\s*\(/);
      expect(code, file).not.toMatch(/createElement\s*\(\s*['"](?:select|option)['"]\s*\)/);
      expect(code, file).not.toMatch(/HTMLSelectElement/);
    }
    expect(dropdownSrc).toContain('(doc.body ?? root).appendChild(list)');
    expect(dropdownSrc).toContain('coo-dd-portal');
    expect(cssContent).toMatch(/\.coo-dd-list\s*\{[\s\S]*?position:\s*fixed[\s\S]*?z-index:\s*1000/);
    expect(cssContent).toMatch(/\.coo-dd-option:hover[\s\S]*?background:\s*#F3F4F6/i);
  });

  it('铁律 4：作品页日期选择器严格保持单月展示（months: 1）', () => {
    expect(localClient).toMatch(/createDateRangePicker\(\{[\s\S]*?months:\s*1\b/);
    expect(localClient).not.toMatch(/createDateRangePicker\(\{[\s\S]*?months:\s*2\b/);
  });

  it('顶部第一层遗留标签逻辑已从客户端入口彻底清理', () => {
    expect(clientEntry).not.toContain('STYLE_LABELS');
    expect(clientEntry).not.toContain('QuotaOutcome');
  });

  it('Checkpoint 警告框、LoRA 固定表头卡片与高级参数面板结构符合规范', () => {
    // Checkpoint 警告卡片
    expect(localClient).toContain('coo-checkpoint-alert');
    expect(localClient).toContain('openModelFolder');
    expect(cssContent).toMatch(/\.coo-checkpoint-alert\s*\{[\s\S]*?background-color:\s*#FEF2F2/i);

    // LoRA 表格卡片：表头与滚动表体分离，仅在存在不同分类名时渲染 sub-text
    expect(localClient).toContain('coo-lora-table-card');
    expect(localClient).toContain('coo-lora-header');
    expect(localClient).toContain('coo-lora-body');
    expect(localClient).toContain('sub-text');
    expect(cssContent).toMatch(/\.coo-lora-header\s*\{[\s\S]*?height:\s*36px/);
    expect(cssContent).toMatch(/\.coo-lora-table-card \.col-check\s*\{[\s\S]*?width:\s*36px/);
    expect(cssContent).toMatch(/\.coo-lora-table-card \.col-weight\s*\{[\s\S]*?width:\s*140px/);

    // 高级参数面板：flex-end 底部对齐 + 种子骰子水平组合，杜绝把 'hidden' 当文本塞入节点
    expect(localClient).toContain('coo-advanced-panel');
    expect(localClient).toContain('seed-input-group');
    expect(localClient).toContain('btn-shuffle');
    expect(localClient).not.toContain("ctx.ui.h('div', 'coo-adv-body', advCollapsed ? 'hidden' : '')");
    expect(cssContent).toMatch(/\.coo-advanced-panel\s*\{[\s\S]*?align-items:\s*flex-end/);
    expect(cssContent).toMatch(/\.coo-form-item\.item-sampler\s*\{\s*width:\s*130px;\s*\}/);
    expect(cssContent).toMatch(/\.coo-form-item\.item-scheduler\s*\{\s*width:\s*110px;\s*\}/);
    expect(cssContent).toMatch(/\.coo-form-item\.item-number\s*\{\s*width:\s*70px;\s*\}/);
    expect(cssContent).toMatch(/\.coo-form-item\.item-seed\s*\{\s*width:\s*140px;\s*\}/);
  });

  it('作品页 LoRA 标签名称与权重分离：长名称在 .lora-name 省略，.weight 禁止收缩裁切', () => {
    expect(localClient).toContain("txt.className = 'lora-name'");
    expect(cssContent).toMatch(/\.coo-lora-chip\s+\.lora-name\s*\{[\s\S]*?min-width:\s*0[\s\S]*?overflow:\s*hidden[\s\S]*?text-overflow:\s*ellipsis/);
    expect(cssContent).toMatch(/\.coo-lora-chip\s+\.weight\s*\{[\s\S]*?flex-shrink:\s*0/);
  });

  it('未配置模型目录时调用 openModelFolder 会给出清晰中文提示', async () => {
    const dir = tempDir();
    try {
      const world = new CooGenWorld({
        cfg: testCfg({ comfyDir: '', modelsDir: '' }),
        timezone: 'Asia/Shanghai',
        dataDir: dir,
        botDir: dir,
        botName: 'Coo',
        secret: () => '',
        clientFactory: () => new FakeComfy(),
      });
      const ui = world.webUi('zh');
      await expect(ui.invoke!('studio', 'openModelFolder', [])).rejects.toThrow('尚未配置 ComfyUI 目录或模型根目录');
      await world.stop();
    } finally {
      removeDir(dir);
    }
  });
});
