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

  it('作品页操作区已物理移除冗余的「使用全部参数」与「复制种子」按钮（元信息区保留种子复制）', () => {
    expect(localClient).not.toContain('使用全部参数');
    expect(localClient).not.toContain('Use all params');
    expect(localClient).not.toContain('复制种子');
    expect(localClient).not.toContain('Copy seed');
    expect(localClient).toContain("addRow('seed'");
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

  it('作品收藏持久化：面板经 setFavorite 读写同一字段，并提供已收藏筛选', () => {
    expect(localClient).toContain("ctx.invoke('setFavorite'");
    expect(localClient).toContain('is_favorite');
    expect(localClient).toContain("t('已收藏', 'Favorites')");
    expect(localClient).toContain('coo-work-fav');
    expect(localClient).not.toContain('本地标记');
  });

  it('作品元信息必须包含主模型 / 文本编码器 / VAE，空值显示未记录', () => {
    expect(localClient).toContain("addRow('model', t('主模型','Model')");
    expect(localClient).toContain("addRow('textEncoder', t('文本编码器','Text encoder')");
    expect(localClient).toContain("addRow('vae', 'VAE'");
    expect(localClient).toContain("t('未记录','Not recorded')");
    // LoRA 芯片：clip 与 model 不一致时展示「model/clip」
    expect(localClient).toContain('clip !== l.weight');
    expect(localClient).toContain('model ${l.weight} / clip ${clip}');
  });

  it('出图页 LoRA 行内必须同时渲染 Model 与 CLIP 两个 32px 步进器', () => {
    // 表头双列 + 行内双步进器 + 提交载荷携带 clip_weight
    expect(localClient).toContain('makeLoraStepper');
    expect(localClient).toContain("makeLoraStepper(record, 'weight', checked)");
    expect(localClient).toContain("makeLoraStepper(record, 'clip_weight', checked)");
    expect(localClient).toContain('clip_weight: entry.clip_weight');
    // 步进器高度仍由铁律 2 统一守卫为 32px
    expect(cssContent).toMatch(/\.coo-stepper\s*\{[\s\S]*?height:\s*32px/);
  });

  it('作品删除必须经确认弹窗与 deleteWorks 接口，作品域禁用原生 confirm', () => {
    expect(localClient).toContain('openDeleteDialog');
    expect(localClient).toContain('openDeleteDialog([entry.id])');
    expect(localClient).toContain("ctx.invoke('deleteWorks'");
    expect(localClient).toContain('coo-dialog-overlay');
    expect(localClient).toContain('coo-dialog__check');
    expect(localClient).toContain('同时删除本地文件');
    // 作品域旧的原生确认文案已彻底移除（剩余 confirm 仅属于 ComfyUI 开关与工作流管理）
    expect(localClient).not.toContain('批量删除？');
    expect(localClient).not.toContain('此操作不可恢复');
    expect(cssContent).toMatch(/\.coo-dialog-overlay\s*\{[\s\S]*?position:\s*fixed/);
    expect(cssContent).toMatch(/\.coo-dialog\s*\{[\s\S]*?background/);
  });

});
