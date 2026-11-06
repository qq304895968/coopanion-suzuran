/**
 * 本地页签「配置」子页：API 绘画与本地出图的精简配置。
 * 宽表在宿主原生设置页（world:draw / world:draw-local / world:draw-persona），
 * 这里只收拢高频项：读一次 drawConfig 取齐，写全部走 ctx.setConfig（宿主负责校验 + 热更新 + 持久化）。
 */
import type { WebUiPanel, WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';
import { createDropdown } from './ui-dropdown.ts';

interface DrawConfigSnapshot {
  api: {
    style: string;
    customStyle: string;
    dailyLimit: number;
    maxImagesPerCall: number;
    routePet: string;
    routeDiary: string;
  };
  folder: { path: string; fallback: boolean };
  presets: { presets: Array<{ id: string; name: string }>; default_workflow: string };
  local: { url: string; outputDir: string; modelsDir: string; defaultWorkflow: string; launchScript: string };
}

const STYLE_OPTIONS: Array<{ value: string; zh: string; en: string }> = [
  { value: 'crayon', zh: '蜡笔涂鸦', en: 'Crayon doodle' },
  { value: 'pencil', zh: '铅笔素描', en: 'Pencil sketch' },
  { value: 'marker', zh: '马克笔', en: 'Marker' },
  { value: 'ink', zh: '墨水', en: 'Ink' },
  { value: 'charcoal', zh: '炭笔', en: 'Charcoal' },
  { value: 'pen', zh: '钢笔', en: 'Pen' },
  { value: 'pixel', zh: '像素', en: 'Pixel' },
  { value: 'custom', zh: '自定义', en: 'Custom' },
];

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const configPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });

    const sheet = ctx.ui.sheet({
      title: t('配置', 'Settings'),
      desc: t('常用项收拢在这里；完整字段仍在宿主设置页。', 'Frequent items live here; the full schema stays in host settings.'),
    });
    ctx.root.append(sheet.el);
    const loading = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    sheet.body.append(loading);

    const save = async (group: string, values: Record<string, string | number | boolean>): Promise<void> => {
      try {
        const result = await ctx.setConfig(group, values);
        if (!alive) return;
        ctx.ui.toast(result || t('已保存', 'Saved'));
      } catch (error) {
        if (!alive) return;
        ctx.ui.toast(message(error), 'bad');
      }
    };

    let snapshot: DrawConfigSnapshot;
    try {
      snapshot = await ctx.invoke<DrawConfigSnapshot>('drawConfig');
      if (!alive) return;
    } catch (error) {
      if (!alive) return;
      loading.classList.add('bad');
      loading.textContent = message(error);
      return;
    }
    loading.remove();

    const box = ctx.ui.h('div', 'coo-config');
    const sectionHead = (title: string, desc: string) => {
      const head = ctx.ui.h('div', 'coo-section-title', title);
      head.append(ctx.ui.h('span', 'coo-section-desc', desc));
      return head;
    };
    const apiSection = ctx.ui.h('div', 'coo-section');
    const localSection = ctx.ui.h('div', 'coo-section');
    apiSection.append(sectionHead(
      t('API 绘画', 'API drawing'),
      t('路由、画风、配额与画夹目录。', 'Routes, style, quota and gallery folder.'),
    ));
    const routeRow = (label: string, key: 'routePet' | 'routeDiary') => {
      const seg = ctx.ui.segmented(
        [
          { value: 'api', label: t('API', 'API') },
          { value: 'local', label: t('本地', 'Local') },
        ],
        {
          value: snapshot.api[key] === 'local' ? 'local' : 'api',
          onSelect: (picked) => { void save('world:draw', { [`worlds.draw.${key}`]: picked }); },
        },
      );
      return ctx.ui.field(label, seg.el);
    };
    apiSection.append(routeRow(t('宠物画像路由', 'Pet portrait route'), 'routePet'));
    apiSection.append(routeRow(t('手帐路由', 'Diary route'), 'routeDiary'));

    const styleDropdown = createDropdown({
      ariaLabel: t('默认画风', 'Default style'),
      options: STYLE_OPTIONS.map((entry) => ({ value: entry.value, label: zh ? entry.zh : entry.en })),
      value: snapshot.api.style,
      onChange: (picked) => { void save('world:draw', { 'worlds.draw.style': picked }); },
    });
    ctx.own({ dispose: () => { styleDropdown.close(); } });
    apiSection.append(ctx.ui.field(t('默认画风', 'Default style'), styleDropdown.el));

    const numberRow = (label: string, key: 'dailyLimit' | 'maxImagesPerCall', min: number, max: number) => {
      const input = ctx.ui.input({ type: 'number', value: String(snapshot.api[key]) });
      input.min = String(min);
      input.max = String(max);
      input.addEventListener('change', () => {
        const next = Math.min(max, Math.max(min, Math.round(Number(input.value))));
        input.value = String(next);
        void save('world:draw', { [`worlds.draw.${key}`]: next });
      });
      return ctx.ui.field(label, input);
    };
    apiSection.append(numberRow(t('每日上限', 'Daily limit'), 'dailyLimit', 0, 200));
    apiSection.append(numberRow(t('单次成图', 'Images per call'), 'maxImagesPerCall', 1, 4));

    const pathRow = (label: string, value: string, group: string, key: string, dirsOnly: boolean) => {
      const input = ctx.ui.input({ value });
      const row = ctx.ui.rowbar();
      const choose = ctx.ui.button(t('选择', 'Browse'), {
        size: 'sm',
        onClick: async () => {
          const picked = await ctx.pickPath!({ kind: dirsOnly ? 'directory' : 'file' });
          if (!picked || !alive) return;
          input.value = picked;
          await save(group, { [key]: picked });
        },
      });
      if (typeof ctx.pickPath !== 'function') choose.disabled = true;
      input.addEventListener('change', () => {
        if (!alive) return;
        void save(group, { [key]: input.value });
      });
      row.append(ctx.ui.field(label, input), choose);
      return row;
    };
    apiSection.append(pathRow(t('画夹目录', 'Gallery folder'), snapshot.folder.path, 'world:draw', 'worlds.draw.saveDir', true));

    localSection.append(sectionHead(
      t('本地出图', 'Local generation'),
      t('连接、目录、默认工作流与一键启动。', 'Connection, folders, default workflow and one-click launch.'),
    ));
    const urlInput = ctx.ui.input({ value: snapshot.local.url, placeholder: 'http://127.0.0.1:8188' });
    urlInput.addEventListener('change', () => {
      if (!alive) return;
      void save('world:draw-local', { 'worlds.draw.localUrl': urlInput.value });
    });
    localSection.append(ctx.ui.field(t('服务地址', 'Server URL'), urlInput));
    localSection.append(pathRow(t('输出目录', 'Output folder'), snapshot.local.outputDir, 'world:draw-local', 'worlds.draw.localOutputDir', true));
    localSection.append(pathRow(t('模型目录', 'Models folder'), snapshot.local.modelsDir, 'world:draw-local', 'worlds.draw.localModelsDir', true));

    const workflowDropdown = createDropdown({
      ariaLabel: t('默认工作流', 'Default workflow'),
      options: snapshot.presets.presets.map((entry) => ({ value: entry.id, label: entry.name })),
      value: snapshot.local.defaultWorkflow || snapshot.presets.default_workflow,
      onChange: (picked) => { void save('world:draw-local', { 'worlds.draw.localDefaultWorkflow': picked }); },
    });
    ctx.own({ dispose: () => { workflowDropdown.close(); } });
    localSection.append(ctx.ui.field(t('默认工作流', 'Default workflow'), workflowDropdown.el));
    localSection.append(pathRow(t('启动脚本', 'Launch script'), snapshot.local.launchScript, 'world:draw-local', 'worlds.draw.localLaunchScript', false));

    box.append(apiSection, localSection);
    sheet.body.append(box);
  },
};

export { configPanel };
