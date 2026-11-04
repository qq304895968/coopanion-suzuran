/**
 * 「画室」的两个页签：
 * - api：画夹 + 今天还能画几张（沿用 pet-draw 的画夹面板）；
 * - local：用分段器切换「出图 / LoRA 管理 / 工作流」，三段都是原来的 coo-gen 面板，
 *   通过 mountSlot 嵌进来，invoke 仍按各自的 panel id 路由。
 */
import type {
  Disposable, WebUiClientBundle, WebUiPanel, WebUiPanelContext,
} from 'cortico/web/shared/client-panel.ts';
import './style.css';
import { folderPanel } from './parts/api-client.ts';
import { studioPanel, lorasPanel, workflowsPanel } from './parts/local-client.ts';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface QuotaOutcome {
  text: string;
  failed?: boolean;
}

interface ApiSettings {
  style: string;
  customStyle: string;
  dailyLimit: number;
  maxImagesPerCall: number;
  routePet: string;
  routeDiary: string;
}

const STYLE_LABELS: ReadonlyArray<{ value: string; zh: string; en: string }> = [
  { value: 'crayon', zh: '蜡笔涂鸦', en: 'Crayon doodle' },
  { value: 'pencil', zh: '铅笔速写', en: 'Pencil sketch' },
  { value: 'marker', zh: '马克笔小插画', en: 'Marker sketch' },
  { value: 'ink', zh: '水墨小品', en: 'Ink wash' },
  { value: 'charcoal', zh: '炭笔速写', en: 'Charcoal sketch' },
  { value: 'pen', zh: '钢笔淡彩', en: 'Pen and wash' },
  { value: 'pixel', zh: '像素画', en: 'Pixel art' },
  { value: 'custom', zh: '自定义画风', en: 'Custom style' },
];

const apiPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);

    await folderPanel.mount(ctx);

    let settings: ApiSettings;
    try {
      settings = await ctx.invoke<ApiSettings>('settings');
    } catch (error) {
      const line = ctx.ui.msgline(`${t('读取画风失败：', 'Failed to load style: ')}${message(error)}`, true);
      ctx.root.append(line);
      return;
    }

    const styleSheet = ctx.ui.sheet({
      title: t('画风与额度', 'Style & quota'),
      desc: t(
        '画风固定后不会因为别人要求就换。两处路由在 World 设置里改；这里只改共用的人设设定。',
        'The style is fixed; the two routes live in World settings. These are the shared persona settings.',
      ),
    });
    const styleSelect = ctx.ui.select({
      value: settings.style,
      options: STYLE_LABELS.map((item) => ({ value: item.value, label: zh ? item.zh : item.en })),
      onChange: (value: string) => {
        void ctx.setConfig('world:draw', { 'worlds.draw.style': value })
          .then(() => { status.textContent = t('画风已保存', 'Style saved'); status.classList.remove('bad'); })
          .catch((error: unknown) => { status.textContent = message(error); status.classList.add('bad'); });
      },
    });
    const customInput = ctx.ui.input({
      value: settings.customStyle,
      placeholder: t('画风选「自定义」时用这段说明', 'Used when the style is “Custom”'),
      cls: 'grow',
    });
    const customSave = ctx.ui.button(t('保存说明', 'Save note'), {
      size: 'sm',
      onClick: () => {
        void ctx.setConfig('world:draw', { 'worlds.draw.customStyle': customInput.value })
          .then(() => { status.textContent = t('画风说明已保存', 'Style note saved'); status.classList.remove('bad'); })
          .catch((error: unknown) => { status.textContent = message(error); status.classList.add('bad'); });
      },
    });
    const customRow = ctx.ui.rowbar();
    customRow.append(customInput, customSave);

    const limitInput = ctx.ui.input({ type: 'number', value: String(settings.dailyLimit), cls: 'mono' });
    const limitSave = ctx.ui.button(t('保存额度', 'Save limit'), {
      size: 'sm',
      onClick: () => {
        const value = Math.max(0, Math.min(200, Number(limitInput.value) || 0));
        void ctx.setConfig('world:draw', { 'worlds.draw.dailyLimit': value })
          .then(() => {
            limitInput.value = String(value);
            status.textContent = t('额度已保存', 'Limit saved');
            status.classList.remove('bad');
          })
          .catch((error: unknown) => { status.textContent = message(error); status.classList.add('bad'); });
      },
    });
    const limitRow = ctx.ui.rowbar();
    limitRow.append(ctx.ui.field(t('每天最多', 'Per day'), limitInput), limitSave);

    const routeName = (value: string): string => (value === 'local' ? t('本地 ComfyUI', 'Local ComfyUI') : t('API（千问）', 'API (Qianwen)'));
    const routeLine = ctx.ui.msgline(t(
      `桌宠主动画：${routeName(settings.routePet)} · 日记配图：${routeName(settings.routeDiary)}（在 World 设置里改）`,
      `Pet drawings: ${routeName(settings.routePet)} · Diary: ${routeName(settings.routeDiary)} (change in World settings)`,
    ));
    const status = ctx.ui.msgline('');

    styleSheet.body.append(
      ctx.ui.field(t('画风', 'Style'), styleSelect),
      customRow,
      routeLine,
      limitRow,
      status,
    );
    ctx.root.append(styleSheet.el);

    const sheet = ctx.ui.sheet({
      title: t('额度', 'Quota'),
      desc: t(
        '今天还能画几张、每次上限；API 路线的限流来自千问。本地路线不吃这里的额度。',
        'How many are left today and the per-call cap; the API route uses Qianwen rate limits. The local route does not consume this quota.',
      ),
    });
    const line = ctx.ui.msgline(t('正在查…', 'Checking…'));
    const refresh = ctx.ui.button(t('刷新', 'Refresh'), {
      size: 'sm',
      onClick: () => { void load(true); },
    });
    const row = ctx.ui.rowbar();
    row.append(refresh);
    sheet.body.append(line, row);
    ctx.root.append(sheet.el);

    const load = async (force = false): Promise<void> => {
      line.classList.remove('bad');
      line.textContent = t('正在查…', 'Checking…');
      try {
        const outcome = await ctx.invoke<QuotaOutcome>('quota', [force]);
        line.textContent = outcome.text.replace(/^\[quota\]\s*/, '');
        line.classList.toggle('bad', outcome.failed === true);
      } catch (error) {
        line.classList.add('bad');
        line.textContent = message(error);
      }
    };

    await load();
  },
};

const LOCAL_SUBS = [
  { value: 'studio', label: ['出图', 'Studio'], panel: studioPanel },
  { value: 'loras', label: ['LoRA 管理', 'LoRAs'], panel: lorasPanel },
  { value: 'workflows', label: ['工作流', 'Workflows'], panel: workflowsPanel },
] as const;

const localPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    const doc = ctx.root.ownerDocument;

    const seg = ctx.ui.segmented(
      LOCAL_SUBS.map((item) => ({ value: item.value, label: zh ? item.label[0] : item.label[1] })),
      {
        value: 'studio',
        onSelect: (value: string) => { void show(value); },
      },
    );

    const host = doc.createElement('div');
    ctx.root.append(seg.el, host);

    let controller: AbortController | null = null;
    let disposables: Disposable[] = [];
    let current = '';

    async function show(value: string): Promise<void> {
      if (value === current) return;
      current = value;
      // 切换子面板：先撤掉上一块的监听和资源，再挂新的。
      controller?.abort();
      for (const item of disposables.splice(0)) {
        try { item.dispose(); } catch { /* 已释放 */ }
      }
      host.replaceChildren();
      seg.setValue(value);

      controller = new AbortController();
      if (ctx.signal.aborted) controller.abort();
      else ctx.signal.addEventListener('abort', () => controller?.abort(), { once: true });

      const entry = LOCAL_SUBS.find((item) => item.value === value);
      if (!entry) return;
      // 子面板拿到的 ctx 仍属于「本地出图」面板，但 invoke 加前缀转发给原 studio/loras/workflows。
      const child: WebUiPanelContext = {
        ...ctx,
        root: host,
        signal: controller.signal,
        invoke: (method: string, args?: unknown[]) => ctx.invoke(`${value}.${method}`, args),
        invokeBinary: (method: string, args?: unknown[]) => ctx.invokeBinary(`${value}.${method}`, args),
        own: <T extends Disposable>(item: T): T => {
          disposables.push(item);
          return item;
        },
      };
      try {
        await entry.panel.mount(child);
      } catch (error) {
        host.append(ctx.ui.msgline(`${t('面板加载失败：', 'Panel failed: ')}${message(error)}`, true));
      }
    }

    ctx.own({
      dispose: () => {
        controller?.abort();
        for (const item of disposables.splice(0)) {
          try { item.dispose(); } catch { /* 已释放 */ }
        }
      },
    });

    await show('studio');
  },
};

const bundle: WebUiClientBundle = {
  panels: {
    api: apiPanel,
    local: localPanel,
    studio: studioPanel,
    loras: lorasPanel,
    workflows: workflowsPanel,
  },
};

export default bundle;
