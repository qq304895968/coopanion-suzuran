/**
 * 「画室」顶层面板：
 * - api：画夹（精简，不再展示冗余的顶部标签；画风/额度等移至配置或用图标入口）
 * - local：本地出图 —— 二级分段器：出图 / 作品 / LoRA 管理 / 工作流
 */
import type {
  Disposable, WebUiClientBundle, WebUiPanel, WebUiPanelContext,
} from 'cortico/web/shared/client-panel.ts';
import './style.css';
import { folderPanel } from './parts/api-client.ts';
import { studioPanel, lorasPanel, workflowsPanel, worksPanel } from './parts/local-client.ts';

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

// 精简后的 API 面板：只保留画夹与必要说明，去除旧的顶部状态标签
const apiPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);

    await folderPanel.mount(ctx);

    // 轻量诊断入口（📊 图标按钮）—— 状态信息移至配置或按需查看
    let settings: ApiSettings | null = null;
    try {
      settings = await ctx.invoke<ApiSettings>('settings');
    } catch {
      // 读不到也不阻塞画夹
    }

    // 顶部第一层标签栏已按需求完全移除（不保留、不迁移）
  },
};

const LOCAL_SUBS = [
  { value: 'studio', label: ['出图', 'Studio'], panel: studioPanel, backend: 'studio' as const },
  { value: 'works', label: ['作品', 'Works'], panel: worksPanel, backend: 'studio' as const },
  { value: 'loras', label: ['LoRA 管理', 'LoRAs'], panel: lorasPanel, backend: 'loras' as const },
  { value: 'workflows', label: ['工作流', 'Workflows'], panel: workflowsPanel, backend: 'workflows' as const },
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

    // 供子面板触发切换（例如生成完成后“查看作品 →”）
    const switchTo = (value: string): void => { void show(value); };
    // 子面板可通过自定义事件请求切换
    host.addEventListener('coo-switch-tab', (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail && LOCAL_SUBS.some(s => s.value === detail)) switchTo(detail);
    });
    // 作品未读红点（Tab 标题）
    host.addEventListener('coo-works-unread', (e: Event) => {
      const unread = (e as CustomEvent<number>).detail;
      // 找到“作品”分段按钮
      const btn = seg.el.querySelectorAll('button');
      for (const b of Array.from(btn)) {
        const txt = b.textContent || '';
        if (txt.includes('作品') || txt.includes('Works')) {
          let dot = b.querySelector('.coo-tab-dot') as HTMLElement | null;
          if (unread > 0) {
            if (!dot) { dot = doc.createElement('span'); dot.className = 'coo-tab-dot'; b.append(dot); }
          } else if (dot) dot.remove();
          break;
        }
      }
    });

    async function show(value: string): Promise<void> {
      if (value === current) return;
      current = value;
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
      // 作品页复用 studio 后端；其它按 backend 前缀转发
      const prefix = entry.backend;
      const child: WebUiPanelContext & { switchTab?: (v: string) => void } = {
        ...ctx,
        root: host,
        signal: controller.signal,
        invoke: (method: string, args?: unknown[]) => ctx.invoke(`${prefix}.${method}`, args),
        invokeBinary: (method: string, args?: unknown[]) => ctx.invokeBinary(`${prefix}.${method}`, args),
        own: <T extends Disposable>(item: T): T => {
          disposables.push(item);
          return item;
        },
      } as any;
      (child as any).switchTab = switchTo;

      try {
        await entry.panel.mount(child as WebUiPanelContext);
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
    works: worksPanel,
  },
};

export default bundle;
