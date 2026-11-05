/**
 * 「本地出图」子面板：出图（左右分栏）+ 作品（新增）+ LoRA 管理 + 工作流
 * - 出图：左栏参数 + 右栏连接/进度，支持空 checkpoint 提示、尺寸联动、分组展示
 * - 作品：缩略图画廊 + 详情操作，已与出图共享历史与进度状态
 */
import type {
  WebUiPanel, WebUiPanelContext, WebUiProgress, WebUiTable,
} from 'cortico/web/shared/client-panel.ts';
import type {
  CooGenBootstrap, DefaultLoRA, GenerateResponse, GenerateTaskView, HistoryEntry, LoRARecord,
  ParamMapping, StatusResponse, WorkflowSummary,
} from '../../local/types.ts';
import { createDateRangePicker, type DateRangePickerHandle } from './date-range-picker.ts';
import { dayEndExclusiveValue, dayStartValue, parseDate } from './date-range-model.ts';
import { closeAllPopovers, closePopover, openPopover } from './popover-stack.ts';
import { createCaretIcon, createDropdown } from './ui-dropdown.ts';


interface HistoryResponse {
  task: GenerateTaskView | null;
  history: HistoryEntry[];
  total: number;
}
interface PresetDetail {
  ok: boolean;
  preset?: {
    id: string;
    name: string;
    builtin: boolean;
    kind?: string;
    mapping: ParamMapping[];
    warnings: string[];
  };
  error?: string;
}
interface LoraListResponse {
  loras: LoRARecord[];
  defaults: DefaultLoRA[];
  aliases: Record<string, string[]>;
  lora_root: string;
}

function errText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function splitList(text: string): string[] {
  return text.split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}
function setOptions(select: HTMLSelectElement, values: readonly string[], selected: string): void {
  select.replaceChildren();
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  if (selected && !values.includes(selected)) {
    const option = document.createElement('option');
    option.value = selected;
    option.textContent = selected;
    select.append(option);
  }
  if (selected) select.value = selected;
}
function objectUrl(ctx: WebUiPanelContext, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  ctx.own({ dispose: () => URL.revokeObjectURL(url) });
  return url;
}
function pill(ctx: WebUiPanelContext, text: string, tone?: 'on' | 'off' | 'plain'): HTMLSpanElement {
  return ctx.ui.pill(text, tone);
}
function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
function stripExt(name: string): string {
  return name.replace(/\.(safetensors|ckpt|pt|pth)$/i, '');
}
function svgIcon(name: string, size = 16): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.classList.add('coo-icon');
  svg.style.width = size+'px'; svg.style.height = size+'px'; svg.style.verticalAlign='middle';
  let inner='';
  if(name==='info') inner='<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 11h1v5h1"/>';
  else if(name==='shuffle') inner='<path d="M16 3h4v4"/><path d="M16 21h4v-4"/><path d="M8 8l8 8"/><path d="M8 16l8-8"/>';
  else if(name==='swap') inner='<path d="M7 16V4"/><path d="M7 16l3-3"/><path d="M7 16l-3-3"/><path d="M17 8v12"/><path d="M17 8l3 3"/><path d="M17 8l-3 3"/>';
  else if(name==='chevronRight') inner='<path d="M9 18l6-6-6-6"/>';
  else if(name==='chevronDown') inner='<path d="M6 9l6 6 6-6"/>';
  else if(name==='arrowRight') inner='<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>';
  else if(name==='refresh') inner='<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>';
  else if(name==='warn') inner='<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 1.71H20.47a2 2 0 0 0 1.71-1.71L13.71 3.86a1 1 0 0 0-1.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
  else if(name==='plug') inner='<path d="M7 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4"/><path d="M10 11v6"/><path d="M14 11v6"/><rect x="7" y="17" width="10" height="3" rx="1"/>';
  else if(name==='gear') inner='<circle cx="12" cy="12" r="3"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>';
  else if(name==='checkbox') inner='<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>';
  else if(name==='check') inner='<path d="M20 6L9 17l-5-5"/>';
  else if(name==='copy') inner='<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>';
  else if(name==='send') inner='<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>';
  else if(name==='compare') inner='<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>';
  else if(name==='folder') inner='<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>';
  else if(name==='star') inner='<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z"/>';
  else if(name==='trash') inner='<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>';
  else if(name==='sliders') inner='<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>';
  else if(name==='layers') inner='<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>';
  else inner='<circle cx="12" cy="12" r="9"/>';
  svg.innerHTML = inner;
  return svg as unknown as HTMLElement;
}
function iconWithText(iconName: string, text: string, size=16): HTMLElement {
  const wrap = document.createElement('span'); wrap.className='coo-icon-btn'; wrap.style.display='inline-flex'; wrap.style.alignItems='center'; wrap.style.gap='4px';
  wrap.append(svgIcon(iconName, size), document.createTextNode(text));
  return wrap;
}
const PARAM_LABELS: Record<string,string> = { positive: '正向提示词', negative: '反向提示词', checkpoint: '模型', steps: '步数', cfg: 'CFG', seed: '种子', sampler: '采样器', scheduler: '调度器', width: '宽', height: '高', batch: '批次' };


// 共享内存：跨子 Tab 保持生成状态，避免切换后进度丢失
interface SharedDrawState {
  boot: CooGenBootstrap | null;
  checkpoints: string[];
  loras: LoRARecord[];
  controlNets: string[];
  presets: WorkflowSummary[];
  history: HistoryEntry[];
  current: GenerateTaskView | null;
  lastFinished: string;
  resultEntry: HistoryEntry | null;
  resultUrl: string;
}
const shared: SharedDrawState = {
  boot: null,
  checkpoints: [],
  loras: [],
  controlNets: [],
  presets: [],
  history: [],
  current: null,
  lastFinished: '',
  resultEntry: null,
  resultUrl: '',
};


/* ------------------------------------------------------------------ studio */

const SIZE_PRESETS: Array<{ value: string; labelZh: string; labelEn: string; w: number; h: number }> = [
  { value: '512x512', labelZh: '512×512', labelEn: '512×512', w: 512, h: 512 },
  { value: '768x768', labelZh: '768×768', labelEn: '768×768', w: 768, h: 768 },
  { value: '1024x1024', labelZh: '1024×1024', labelEn: '1024×1024', w: 1024, h: 1024 },
  { value: '768x1152', labelZh: '768×1152', labelEn: '768×1152', w: 768, h: 1152 },
  { value: '1152x768', labelZh: '1152×768', labelEn: '1152×768', w: 1152, h: 768 },
  { value: '832x1216', labelZh: '832×1216', labelEn: '832×1216', w: 832, h: 1216 },
  { value: '1216x832', labelZh: '1216×832', labelEn: '1216×832', w: 1216, h: 832 },
  { value: 'custom', labelZh: '自定义', labelEn: 'Custom', w: 0, h: 0 },
];

const studioPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });

    let boot: CooGenBootstrap;
    try {
      boot = await ctx.invoke<CooGenBootstrap>('bootstrap');
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t('出图', 'Studio') });
      sheet.body.append(ctx.ui.msgline(t('读取失败：', 'Failed: ') + errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;
    shared.boot = boot;
    shared.checkpoints = boot.checkpoints;
    shared.loras = boot.loras;
    shared.controlNets = boot.control_nets ?? [];
    shared.presets = boot.presets;
    if (!shared.history.length) shared.history = boot.history;
    if (!shared.current) shared.current = boot.task;

    const state = {
      workflow: boot.workflow,
      positive: '',
      negative: boot.config.negative_prompt,
      checkpoint: boot.config.default_checkpoint || boot.checkpoints[0] || '',
      sampler: boot.config.sampler,
      scheduler: boot.config.scheduler,
      steps: boot.config.steps,
      cfg: boot.config.cfg,
      width: boot.config.width,
      height: boot.config.height,
      batch: boot.config.batch,
      seed: -1,
      inputImage: '',
      controlImage: '',
      controlNet: '',
      denoise: undefined as number | undefined,
      controlStrength: undefined as number | undefined,
      loras: new Map<string, number>(),
      custom: {} as Record<string, string | number>,
      sizePreset: '768x1152',
    };
    // 初始化尺寸预设联动：根据初始宽高匹配预设
    {
      const match = SIZE_PRESETS.find(p => p.w === state.width && p.h === state.height);
      state.sizePreset = match ? match.value : 'custom';
    }
    for (const lora of boot.defaults) state.loras.set(lora.path, lora.weight);

    let loras = boot.loras;
    let checkpoints = boot.checkpoints;
    let controlNets = boot.control_nets ?? [];
    let presets = boot.presets;
    let history = shared.history;
    let current: GenerateTaskView | null = shared.current;
    let lastFinished = shared.lastFinished;
    let resultEntry: HistoryEntry | null = shared.resultEntry;
    let resultUrl = shared.resultUrl;
    let busy = false;

    // 包装容器
    const left = ctx.ui.h('div', 'coo-draw-left');
    const right = ctx.ui.h('div', 'coo-draw-right');

    /* --------------------------- 左栏：参数设置 --------------------------- */
    const pageWrap = ctx.ui.h('div','coo-page-wrap');
    const pageContent = ctx.ui.h('div','coo-page-content');
    pageWrap.append(pageContent);
    pageContent.append(left, right);
    ctx.root.append(pageWrap);
    // 参数区：无冗余标题，左栏即参数区
    const paramSheet = { el: left, body: left } as unknown as ReturnType<typeof ctx.ui.sheet>;

    // 工作流
    const workflowRow = ctx.ui.rowbar();
    workflowRow.style.alignItems = 'center';
    workflowRow.style.gap = '8px';
    const workflowSelect = ctx.ui.select({
      options: presets.map((item) => ({
        value: item.id,
        label: `${item.name}${item.builtin ? '' : t('（导入）', ' (imported)')}`,
      })),
    });
    workflowSelect.value = state.workflow;
    workflowRow.append(ctx.ui.field(t('工作流', 'Workflow'), workflowSelect));
    // 参数映射 ℹ️ 图标 - 紧跟下拉右侧 8px，垂直居中
    const infoBtn = document.createElement('button');
    infoBtn.className='coo-info-btn';
    infoBtn.title = t('查看参数映射', 'View param mapping');
    infoBtn.append(svgIcon('info', 16));
    infoBtn.style.display='inline-flex'; infoBtn.style.alignItems='center'; infoBtn.style.justifyContent='center';
    infoBtn.style.marginLeft = '8px';
    infoBtn.style.verticalAlign = 'middle';
    infoBtn.addEventListener('click', async () => {
      try {
        const res = await ctx.invoke<PresetDetail>('presetDetail', [state.workflow]);
        if (!res.ok || !res.preset) throw new Error(res.error ?? '读取失败');
        const body = document.createElement('div');
        const intro = ctx.ui.msgline(t(`当前工作流支持通过画室调整以下 ${res.preset.mapping.length} 个参数`, `This workflow exposes ${res.preset.mapping.length} adjustable parameters`));
        body.append(intro);
        const tbl = ctx.ui.table({ head: [t('参数','Param'), t('类型','Type')] });
        for (const m of res.preset.mapping) {
          const label = (PARAM_LABELS[m.param] || m.param);
          tbl.addRow([label, m.ui_type]);
        }
        body.append(tbl.el);
        // 已按要求移除底部 CheckpointLoader 告警
        ctx.ui.drawer(res.preset.name, body);
      } catch (e) { ctx.ui.toast(errText(e), 'bad'); }
    });
    workflowRow.append(infoBtn);
    paramSheet.body.append(workflowRow);

    const makeCounter = (ta: HTMLTextAreaElement, limit=500): HTMLElement => {
      const wrap = ctx.ui.h('div','coo-prompt-wrap');
      const counter = ctx.ui.h('div','coo-prompt-counter','0 / 500');
      const update = (): void => { const len=ta.value.length; counter.textContent = `${len} / ${limit}`; counter.classList.toggle('warn', len>limit*0.8 && len<=limit); counter.classList.toggle('over', len>limit); };
      ta.addEventListener('input', update); update();
      wrap.append(ta, counter);
      // move width to wrap
      return wrap;
    };
    const positive = ctx.ui.textarea({
      value: '', rows: 4,
      placeholder: t('想画什么？例如：塞尔达站在海边看日落，金色时刻，电影感', 'What should it be? e.g. Zelda watching sunset by sea, golden hour, cinematic'),
      onInput: (v) => { state.positive = v; },
    }); positive.style.width = '100%';
    const posWrap = makeCounter(positive, 500);
    paramSheet.body.append(ctx.ui.field(t('正向提示词', 'Positive prompt'), posWrap));

    const negative = ctx.ui.textarea({
      value: state.negative, rows: 2, onInput: (v) => { state.negative = v; },
    }); negative.style.width = '100%';
    const negWrap = makeCounter(negative, 500);
    paramSheet.body.append(ctx.ui.field(t('反向提示词', 'Negative prompt'), negWrap));

    // 模型 Checkpoint（含空状态）
    const checkpointWrap = ctx.ui.h('div', '');
    const checkpointLabel = ctx.ui.h('div', 'coo-group-title', t('模型 Checkpoint', 'Checkpoint'));
    checkpointWrap.append(checkpointLabel);
    const checkpointSelect = document.createElement('select') as HTMLSelectElement;
    checkpointSelect.className = 'select';
    checkpointSelect.style.width = '100%';
    const checkpointEmpty = ctx.ui.h('div', 'coo-empty-card');
    checkpointEmpty.style.display = 'none';
    checkpointWrap.append(checkpointSelect, checkpointEmpty);
    paramSheet.body.append(checkpointWrap);

    const renderCheckpointEmpty = (): void => {
      const needsCheckpoint = (() => {
        const preset = presets.find(p => p.id === state.workflow);
        // 若工作流类型为纯 LoRA 或映射中无 checkpoint，则不需要
        if (preset?.kind && preset.kind !== 'txt2img' && preset.kind !== 'img2img' && preset.kind !== 'controlnet') return false;
        return true;
      })();
      if (!needsCheckpoint) {
        checkpointSelect.style.display = 'none';
        checkpointEmpty.style.display = 'block';
        checkpointEmpty.className = 'coo-empty-card coo-empty-card--neutral';
        checkpointEmpty.replaceChildren();
        const tt = ctx.ui.h('div', 'title', t('当前工作流无需 Checkpoint', 'This workflow does not require a checkpoint'));
        tt.prepend(svgIcon('info', 14));
        tt.style.display='inline-flex'; tt.style.alignItems='center'; tt.style.gap='6px';
        const sub = ctx.ui.msgline(t('已按工作流自动隐藏模型选择。', 'Checkpoint selection hidden for this workflow.'));
        checkpointEmpty.append(tt, sub);
        return;
      }
      if (!checkpoints.length) {
        checkpointSelect.style.display = 'none';
        checkpointEmpty.style.display = 'block';
        checkpointEmpty.className = 'coo-empty-card coo-empty-card--warn';
        checkpointEmpty.replaceChildren();
        const warn = ctx.ui.h('div', 'title', t('未检测到 Checkpoint 模型', 'No checkpoint found'));
        warn.prepend(svgIcon('warn', 14));
        warn.style.display='inline-flex'; warn.style.alignItems='center'; warn.style.gap='6px';
        const msg = ctx.ui.msgline(t(
          `当前工作流「${presets.find(p => p.id === state.workflow)?.name ?? state.workflow}」可能需要一个 Checkpoint 模型才能正常出图。`,
          `Workflow “${presets.find(p => p.id === state.workflow)?.name ?? state.workflow}” may need a checkpoint.`,
        ));
        const paths = ctx.ui.msgline(t(`请将模型文件放入：${boot.model_root || boot.config.model_root || boot.config.models_dir || 'ComfyUI/models/checkpoints'}`, `Put model files into: ${boot.model_root || boot.config.model_root || boot.config.models_dir || 'ComfyUI/models/checkpoints'}`));
        const actions = ctx.ui.rowbar();
        const openDir = ctx.ui.button(t('打开模型目录', 'Open model folder'), { size: 'sm' });
        openDir.addEventListener('click', () => { void ctx.invoke('openFolder').catch(() => ctx.ui.toast(t('请在配置里查看模型目录路径', 'Check model path in settings'), 'bad')); });
        const refresh = ctx.ui.button(t('刷新列表', 'Refresh'), { size: 'sm', variant: 'primary' });
        refresh.addEventListener('click', () => { void doRefreshModels(); });
        actions.append(openDir, refresh);
        checkpointEmpty.append(warn, msg, paths, actions);
      } else {
        checkpointEmpty.style.display = 'none';
        checkpointSelect.style.display = '';
        setOptions(checkpointSelect, checkpoints, state.checkpoint);
        if (!checkpoints.includes(state.checkpoint)) state.checkpoint = checkpoints[0] ?? state.checkpoint;
        checkpointSelect.value = state.checkpoint;
      }
      updateGenerateEnabled();
    };
    checkpointSelect.addEventListener('change', () => { state.checkpoint = checkpointSelect.value; updateGenerateEnabled(); });
    renderCheckpointEmpty();

    // LoRA 列表（搜索+勾选，隐藏扩展名，预设标签）
    const loraHeader = ctx.ui.h('div','coo-lora-header');
    const loraTitle = ctx.ui.h('div', 'coo-group-title', t('LoRA 列表', 'LoRA list'));
    const loraCount = ctx.ui.h('div','coo-lora-count','');
    loraHeader.append(loraTitle, loraCount);
    paramSheet.body.append(loraHeader);
    const loraSearch = ctx.ui.input({ type: 'search', placeholder: t('搜索 LoRA（名称/别名/分类/触发词）', 'Search LoRAs (name/alias/category/trigger)') });
    loraSearch.style.width = '100%';
    paramSheet.body.append(loraSearch);
    // 快捷按钮
    const loraToolbar = ctx.ui.h('div', 'coo-lora-toolbar');
    const btnAll = ctx.ui.button(t('全选', 'Select all'), { size: 'sm' });
    const btnInverse = ctx.ui.button(t('反选', 'Invert'), { size: 'sm' });
    const btnClear = ctx.ui.button(t('清空', 'Clear'), { size: 'sm' });
    loraToolbar.append(btnAll, btnInverse, btnClear);
    paramSheet.body.append(loraToolbar);
    const loraTable: WebUiTable = ctx.ui.table({ head: ['', t('LoRA', 'LoRA'), t('权重', 'Weight')], maxHeight: '360px' });
    // 使其可滚动不撑开
    (loraTable.el as HTMLElement).classList.add('coo-lora-list');
    paramSheet.body.append(loraTable.el);

    const renderLoraCount = (): void => {
      loraCount.textContent = t(`已选 ${state.loras.size} 个`, `${state.loras.size} selected`);
    };
    const renderLoraTable = (): void => {
      const query = loraSearch.value.trim().toLowerCase();
      const filtered = loras.filter((item) => !query || [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words].some((v) => v.toLowerCase().includes(query)));
      if(!filtered.length){ loraTable.clear(t('没有匹配的 LoRA，试试别的关键词','No matching LoRA, try another keyword')); return; } else loraTable.clear(undefined);
      for (const record of filtered.slice(0, 300)) {
        const checked = state.loras.has(record.path);
        const box = ctx.ui.checkbox('', {
          checked,
          onChange: (v) => {
            if (v) { state.loras.set(record.path, record.weight ?? 0.75); }
            else { state.loras.delete(record.path); }
            renderLoraTable(); // 重绘以刷新权重框禁用态
            renderLoraCount();
          },
        });
        box.el.setAttribute('aria-label', record.name);
        const nameCell = document.createElement('div');
        const title = document.createElement('div');
        title.textContent = record.aliases.length ? `${stripExt(record.name)}（${record.aliases.join('/')}）` : stripExt(record.name);
        title.title = record.path;
        const sub = document.createElement('div'); sub.className = 'coo-gen-sub';
        // 隐藏 .safetensors 扩展名，hover 显示完整路径
        const displayPath = stripExt(record.path);
        sub.textContent = [displayPath, record.category || t('未分类', 'uncategorized'), ...(record.trigger_words.length ? [record.trigger_words.slice(0, 4).join('/')] : [])].join(' · ');
        sub.title = record.path;
        nameCell.append(title, sub);
        // 已去掉预设标签，勾选状态即启用
        const weightWrap = ctx.ui.h('div','coo-weight-stepper');
        const weightInput = ctx.ui.input({
          type: 'number', value: String(state.loras.get(record.path) ?? record.weight ?? 0.75), cls: 'mono coo-gen-weight',
        });
        weightInput.min = '-2'; weightInput.max = '2'; weightInput.step = '0.05';
        weightInput.disabled = !checked;
        weightInput.title = t('双击恢复默认值 0.75','Double-click to reset to 0.75');
        weightInput.addEventListener('dblclick', () => { weightInput.value='0.75'; if(state.loras.has(record.path)) state.loras.set(record.path, 0.75); });
        weightInput.addEventListener('change', () => {
          const v = Math.min(2, Math.max(-2, num(weightInput.value, 0.75)));
          if (Math.abs(v) > 2) { ctx.ui.toast(t('权重超出范围 -2 ~ 2','Weight out of range -2 ~ 2'),'bad'); }
          weightInput.value = String(v);
          if (state.loras.has(record.path)) state.loras.set(record.path, v);
        });
        const dec = document.createElement('button'); dec.textContent='−'; dec.className=''; dec.style.cssText='width:22px;height:22px;border:1px solid var(--line,rgba(127,127,127,.2));border-radius:4px;cursor:pointer;background:rgba(127,127,127,.06)';
        const inc = document.createElement('button'); inc.textContent='+'; inc.style.cssText='width:22px;height:22px;border:1px solid var(--line,rgba(127,127,127,.2));border-radius:4px;cursor:pointer;background:rgba(127,127,127,.06)';
        dec.addEventListener('click', ()=>{ const v=Math.max(-2, num(weightInput.value,0.75)-0.05); weightInput.value=v.toFixed(2); if(state.loras.has(record.path)) state.loras.set(record.path, v); persistLora(); });
        inc.addEventListener('click', ()=>{ const v=Math.min(2, num(weightInput.value,0.75)+0.05); weightInput.value=v.toFixed(2); if(state.loras.has(record.path)) state.loras.set(record.path, v); persistLora(); });
        weightWrap.append(dec, weightInput, inc);
        loraTable.addRow([box.el, nameCell, weightWrap]);
      }
      renderLoraCount();
    };
    btnAll.addEventListener('click', () => { for (const l of loras) state.loras.set(l.path, l.weight ?? 0.75); renderLoraTable(); });
    btnInverse.addEventListener('click', () => {
      const next = new Map<string, number>();
      for (const l of loras) if (!state.loras.has(l.path)) next.set(l.path, l.weight ?? 0.75);
      state.loras = next; renderLoraTable();
    });
    btnClear.addEventListener('click', () => { state.loras.clear(); renderLoraTable(); });
    const LORA_STORE_KEY='coo-draw-last-loras';
    const persistLora = (): void => { try{ localStorage.setItem(LORA_STORE_KEY, JSON.stringify([...state.loras.entries()])); }catch{} };
    const restoreLora = (): void => { try{ const raw=localStorage.getItem(LORA_STORE_KEY); if(!raw) return; const arr=JSON.parse(raw) as Array<[string,number]>; if(!Array.isArray(arr)) return; state.loras = new Map(arr.filter(([k,v])=> typeof k==='string' && typeof v==='number' && loras.some(l=>l.path===k))); }catch{} };
    // 首次加载时尝试恢复上次选择（覆盖 defaults）
    restoreLora();
    const patchEmptyCheck = (): void => { if(loraSearch.value.trim() && !loras.filter((item) => [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words].some((v) => v.toLowerCase().includes(loraSearch.value.trim().toLowerCase()))).length){ /* empty handled in render */ } };
    loraSearch.addEventListener('input', renderLoraTable);
    renderLoraTable();

    // 采样参数分组
    // 基本采样 - Grid 4列 12px间距（P0 6.1）
    const basicGroup = ctx.ui.h('div', 'coo-group');
    const basicTitle = ctx.ui.h('div', 'coo-group-title', t('基本采样', 'Sampler'));
    const basicGrid = ctx.ui.h('div', 'coo-sampler-grid');
    const samplerSelect = ctx.ui.select({ options: [] }); setOptions(samplerSelect as unknown as HTMLSelectElement, boot.samplers, state.sampler);
    samplerSelect.addEventListener('change', () => { state.sampler = samplerSelect.value; });
    const schedulerSelect = ctx.ui.select({ options: [] }); setOptions(schedulerSelect as unknown as HTMLSelectElement, boot.schedulers, state.scheduler);
    schedulerSelect.addEventListener('change', () => { state.scheduler = schedulerSelect.value; });
    const stepsInput = ctx.ui.input({ type: 'number', value: String(state.steps), cls: 'mono' }); stepsInput.min='1'; stepsInput.max='100'; stepsInput.step='1';
    stepsInput.addEventListener('change', () => { state.steps = Math.max(1, Math.min(100, Math.round(num(stepsInput.value, state.steps)))); stepsInput.value = String(state.steps); updateProgressMax(); });
    const cfgInput = ctx.ui.input({ type: 'number', value: String(state.cfg), cls: 'mono' }); cfgInput.min='1'; cfgInput.max='30'; cfgInput.step='0.5';
    cfgInput.addEventListener('change', () => { state.cfg = Math.min(30, Math.max(1, num(cfgInput.value, state.cfg))); cfgInput.value = String(state.cfg); });
    basicGrid.append(ctx.ui.field(t('采样器', 'Sampler'), samplerSelect), ctx.ui.field(t('调度器', 'Scheduler'), schedulerSelect), ctx.ui.field(t('步数', 'Steps'), stepsInput), ctx.ui.field('CFG', cfgInput));
    basicGroup.append(basicTitle, basicGrid);
    paramSheet.body.append(basicGroup);

    // 尺寸设置
    const sizeGroup = ctx.ui.h('div', 'coo-group');
    const sizeTitle = ctx.ui.h('div', 'coo-group-title', t('尺寸设置', 'Size'));
    const sizeRow = ctx.ui.h('div', 'coo-size-row');
    const sizeSelect = ctx.ui.select({
      options: SIZE_PRESETS.map(p => ({ value: p.value, label: zh ? p.labelZh : p.labelEn })),
    }); sizeSelect.value = state.sizePreset;
    const widthInput = ctx.ui.input({ type: 'number', value: String(state.width), cls: 'mono coo-gen-num' }); widthInput.min='64'; widthInput.max='4096'; widthInput.step='8';
    const heightInput = ctx.ui.input({ type: 'number', value: String(state.height), cls: 'mono coo-gen-num' }); heightInput.min='64'; heightInput.max='4096'; heightInput.step='8';
    const swapBtn = document.createElement('button'); swapBtn.className='btn plain sm coo-swap-btn'; swapBtn.title = t('交换宽高', 'Swap width/height'); swapBtn.append(svgIcon('swap',16), document.createTextNode(t(' 交换',' Swap'))); (swapBtn as HTMLButtonElement).type='button';
    sizeRow.append(ctx.ui.field(t('尺寸预设', 'Size preset'), sizeSelect), ctx.ui.field(t('宽', 'Width'), widthInput), ctx.ui.field(t('高', 'Height'), heightInput), swapBtn);
    sizeRow.classList.add('coo-swap-btn');
    sizeGroup.append(sizeTitle, sizeRow);
    paramSheet.body.append(sizeGroup);

    // 高级折叠
    const advGroup = ctx.ui.h('div', 'coo-group');
    const advToggle = document.createElement('button'); advToggle.className = 'coo-adv-toggle'; advToggle.setAttribute('aria-expanded','false');
    const advLabel = ctx.ui.h('span','', t('高级','Advanced')); advLabel.style.fontWeight='600';
    const advArrow = svgIcon('chevronRight',14); advArrow.classList.add('coo-adv-arrow');
    advToggle.append(advLabel, advArrow);
    const advBody = ctx.ui.h('div', 'coo-adv-body hidden');
    const batchInput = ctx.ui.input({ type: 'number', value: String(state.batch), cls: 'mono coo-gen-num' }); batchInput.min='1'; batchInput.max='8'; batchInput.step='1';
    batchInput.addEventListener('change', () => { state.batch = Math.max(1, Math.min(8, Math.round(num(batchInput.value, state.batch)))); batchInput.value = String(state.batch); });
    const seedInput = ctx.ui.input({ type: 'number', value: String(state.seed), cls: 'mono coo-gen-num' }); seedInput.min='-1'; seedInput.max='9007199254740991'; seedInput.step='1';
    seedInput.addEventListener('change', () => { const v = Math.trunc(num(seedInput.value, state.seed)); seedInput.value = String(v); state.seed = v; });
    const seedWrap = ctx.ui.h('div', 'coo-seed-wrap');
    seedWrap.style.display = 'inline-flex'; seedWrap.style.alignItems = 'center'; seedWrap.style.gap = '6px';
    const randBtn = document.createElement('button'); randBtn.className='coo-seed-rand'; randBtn.type='button'; randBtn.title = t('随机生成种子','Randomize seed'); randBtn.append(svgIcon('shuffle',16));
    randBtn.style.width='32px'; randBtn.style.height='32px'; randBtn.style.display='inline-flex'; randBtn.style.alignItems='center'; randBtn.style.justifyContent='center'; randBtn.style.border='1px solid var(--line, rgba(127,127,127,.18))'; randBtn.style.borderRadius='6px'; randBtn.style.background='rgba(127,127,127,.04)'; randBtn.style.cursor='pointer'; randBtn.style.flexShrink='0';
    randBtn.addEventListener('mouseenter', ()=>{ randBtn.style.background='rgba(127,127,127,.08)'; }); randBtn.addEventListener('mouseleave', ()=>{ randBtn.style.background='rgba(127,127,127,.04)'; });
    randBtn.addEventListener('click', () => {
      const v = Math.floor(Math.random() * 2147483647);
      state.seed = v; seedInput.value = String(v);
      randBtn.style.transform='rotate(180deg)'; randBtn.style.transition='transform 180ms'; setTimeout(()=>{ randBtn.style.transform='rotate(0deg)'; }, 200);
    });
    seedWrap.append(seedInput, randBtn);
    const batchField = ctx.ui.field(t('批次', 'Batch'), batchInput);
    const seedField = ctx.ui.field(t('种子', 'Seed'), seedWrap);
    advBody.append(batchField, seedField);
    advToggle.addEventListener('click', () => { const hidden = advBody.classList.toggle('hidden'); advToggle.setAttribute('aria-expanded', hidden? 'false':'true'); advArrow.style.transform = hidden ? 'rotate(0deg)' : 'rotate(90deg)'; });
    advGroup.append(advToggle, advBody);
    paramSheet.body.append(advGroup);

    // 尺寸联动
    sizeSelect.addEventListener('change', () => {
      const preset = SIZE_PRESETS.find(p => p.value === sizeSelect.value);
      if (!preset) return;
      state.sizePreset = preset.value;
      if (preset.value !== 'custom') {
        state.width = preset.w; state.height = preset.h;
        widthInput.value = String(preset.w); heightInput.value = String(preset.h);
      }
    });
    const markCustom = (): void => {
      const match = SIZE_PRESETS.find(p => p.w === num(widthInput.value, state.width) && p.h === num(heightInput.value, state.height) && p.value !== 'custom');
      if (match) { state.sizePreset = match.value; sizeSelect.value = match.value; }
      else { state.sizePreset = 'custom'; sizeSelect.value = 'custom'; }
    };
    widthInput.addEventListener('change', () => { state.width = Math.max(64, Math.min(4096, Math.round(num(widthInput.value, state.width)/8)*8)); widthInput.value = String(state.width); markCustom(); });
    heightInput.addEventListener('change', () => { state.height = Math.max(64, Math.min(4096, Math.round(num(heightInput.value, state.height)/8)*8)); heightInput.value = String(state.height); markCustom(); });
    swapBtn.addEventListener('click', () => {
      const w = state.width; state.width = state.height; state.height = w;
      widthInput.value = String(state.width); heightInput.value = String(state.height);
      markCustom();
    });

    // 额外输入（img2img / controlnet / custom）
    const extraBox = ctx.ui.h('div', 'coo-gen-extra');
    paramSheet.body.append(extraBox);

    // 右栏操作区：生成/取消/打开目录（位于 连接卡片 与 进度卡片 之间）
    const genLine = ctx.ui.msgline(''); left.append(genLine);
    const actionFloat = ctx.ui.h('div', 'coo-action-float');
    const actionHint = ctx.ui.h('div', 'hint', ''); actionHint.style.display='none';
    const actionRow = ctx.ui.h('div', 'coo-action-row');
    const generateBtn = ctx.ui.button(t('生成', 'Generate'), { variant: 'primary' });
    generateBtn.className += ' btn-generate';
    generateBtn.style.flex = '1';
    const cancelBtn = ctx.ui.button(t('取消', 'Cancel'));
    cancelBtn.className += ' btn-cancel-idle';
    cancelBtn.disabled = true;
    cancelBtn.style.flex = '1';
    const openFolderBtn = ctx.ui.button(t('打开目录', 'Open folder'), { variant: 'plain', size: 'sm' });
    openFolderBtn.className += ' btn-open';
    openFolderBtn.style.flex = '1';
    openFolderBtn.addEventListener('click', ()=>{ void ctx.invoke('openFolder').then(()=>ctx.ui.toast(t('已请求打开文件夹','Opening folder'))).catch(e=>ctx.ui.toast(errText(e),'bad')); });
    actionRow.append(generateBtn, cancelBtn, openFolderBtn);
    actionFloat.append(actionHint, actionRow);
    const say = (text: string, bad = false): void => { genLine.textContent = text; genLine.classList.toggle('bad', bad); actionHint.textContent = text; actionHint.style.display = text ? 'block' : 'none'; };

    const isActive = (task: GenerateTaskView | null): boolean => !!task && (task.status === 'queued' || task.status === 'running');
    const updateGenerateEnabled = (): void => {
      let disable = false; let hint = '';
      const preset = presets.find(p=>p.id===state.workflow);
      if (checkpoints.length === 0) {
        const needs = ['quick-txt2img','quick-img2img','quick-controlnet'].includes(state.workflow) || preset?.kind==='txt2img' || preset?.kind==='img2img' || preset?.kind==='controlnet';
        if (needs) { disable = true; hint = t('请先选择 Checkpoint 模型', 'Select a checkpoint first'); }
      } else if (!state.checkpoint) { disable = true; hint = t('请先选择 Checkpoint 模型', 'Select a checkpoint first'); }
      // 生成中：生成按钮 60% opacity 仍可点击（不禁用），取消按钮 red fill
      if (isActive(current)) {
        generateBtn.disabled = false; generateBtn.style.opacity = '0.6'; generateBtn.classList.add('is-generating');
        cancelBtn.disabled = false; cancelBtn.className = cancelBtn.className.replace('btn-cancel-idle','').replace('  ',' ').trim() + ' btn-cancel-active'; cancelBtn.style.background='var(--coo-danger)'; cancelBtn.style.color='#fff'; cancelBtn.style.borderColor='var(--coo-danger)';
      } else {
        generateBtn.style.opacity = ''; generateBtn.classList.remove('is-generating');
        cancelBtn.className = cancelBtn.className.replace('btn-cancel-active','').replace('  ',' ').trim() + ' btn-cancel-idle'; cancelBtn.style.background='#fff'; cancelBtn.style.color='#6b7280'; cancelBtn.style.borderColor='rgba(127,127,127,.3)'; cancelBtn.disabled = true;
        generateBtn.disabled = disable || busy;
      }
      if (disable && hint) actionHint.textContent = hint;
      generateBtn.title = disable ? hint : '';
    };

    const collect = () => ({
      positive: state.positive, negative: state.negative, checkpoint: state.checkpoint,
      loras: [...state.loras.entries()].map(([path, weight]) => ({ path, weight })),
      sampler: state.sampler, scheduler: state.scheduler, steps: state.steps, cfg: state.cfg,
      width: state.width, height: state.height, batch: state.batch, seed: state.seed,
      workflow: state.workflow,
      ...(state.inputImage ? { inputImage: state.inputImage } : {}),
      ...(state.controlImage ? { controlImage: state.controlImage } : {}),
      ...(state.controlNet ? { controlNet: state.controlNet } : {}),
      ...(state.denoise !== undefined ? { denoise: state.denoise } : {}),
      ...(state.controlStrength !== undefined ? { controlStrength: state.controlStrength } : {}),
      ...(Object.keys(state.custom).length ? { custom: state.custom } : {}),
    });

    // 工作流 extra 渲染
    const KNOWN_PARAMS = new Set(['positive','negative','checkpoint','steps','cfg','seed','sampler','scheduler','width','height','batch','inputImage','controlImage','controlNet','denoise','controlStrength']);
    async function loadCustomFields(): Promise<void> {
      const workflowId = state.workflow;
      try {
        const res = await ctx.invoke<PresetDetail>('presetDetail', [workflowId]);
        if (!alive || state.workflow !== workflowId || !res.ok || !res.preset) return;
        const custom = res.preset.mapping.filter((item) => !KNOWN_PARAMS.has(item.param));
        if (!custom.length) return;
        const box = ctx.ui.h('div', 'coo-gen-extra');
        box.append(ctx.ui.section(t('自定义参数', 'Custom parameters'), t('从导入工作流里自动识别的参数。', 'Auto-detected from imported workflow.')));
        for (const map of custom) {
          const currentVal = state.custom[map.param] ?? (typeof map.default === 'number' || typeof map.default === 'string' ? map.default : '');
          const control = map.ui_type === 'number' || map.ui_type === 'slider' || map.ui_type === 'seed' ? ctx.ui.input({ type: 'number', value: String(currentVal), cls: 'mono coo-gen-num' }) : ctx.ui.input({ value: String(currentVal), cls: 'mono' });
          control.addEventListener('change', () => {
            if (map.ui_type === 'number' || map.ui_type === 'slider' || map.ui_type === 'seed') state.custom[map.param] = num(control.value, Number(currentVal) || 0);
            else state.custom[map.param] = control.value;
          });
          box.append(ctx.ui.field(`${map.ui_label || map.param} (${map.param})`, control));
        }
        extraBox.append(box);
      } catch {}
    }
    const renderExtra = (): void => {
      extraBox.replaceChildren(); void loadCustomFields();
      const preset = presets.find((item) => item.id === state.workflow);
      const kind = preset?.kind;
      if (kind !== 'img2img' && kind !== 'controlnet') return;
      const row = ctx.ui.rowbar();
      const inputPath = ctx.ui.input({ value: state.inputImage, cls: 'mono', placeholder: t('输入图绝对路径', 'Absolute path to input image') }); inputPath.style.flex='1'; inputPath.style.minWidth='220px';
      const choose = ctx.ui.button(t('选择…', 'Choose…'), { size: 'sm' });
      choose.addEventListener('click', () => {
        void (async () => {
          try { const picked = await ctx.pickPath({ kind: 'file', extensions: ['png','jpg','jpeg','webp'] }); if (picked) { state.inputImage = picked; inputPath.value = picked; } } catch(e){ say(errText(e), true); }
        })();
      });
      inputPath.addEventListener('change', () => { state.inputImage = inputPath.value.trim(); });
      row.append(ctx.ui.field(t('输入图', 'Input image'), inputPath), choose);
      extraBox.append(row);
      if (kind === 'controlnet') {
        const controlRow = ctx.ui.rowbar();
        const controlPath = ctx.ui.input({ value: state.controlImage, cls: 'mono', placeholder: t('控制图绝对路径', 'Absolute path to control image') }); controlPath.style.flex='1'; controlPath.style.minWidth='220px';
        const chooseControl = ctx.ui.button(t('选择…', 'Choose…'), { size: 'sm' });
        chooseControl.addEventListener('click', () => {
          void (async () => { try { const picked = await ctx.pickPath({ kind: 'file', extensions: ['png','jpg','jpeg','webp'] }); if (picked) { state.controlImage = picked; controlPath.value = picked; } } catch(e){ say(errText(e), true); } })();
        });
        controlPath.addEventListener('change', () => { state.controlImage = controlPath.value.trim(); });
        controlRow.append(ctx.ui.field(t('控制图', 'Control image'), controlPath), chooseControl);
        const controlNetSelect = ctx.ui.select({ options: controlNets }); setOptions(controlNetSelect as unknown as HTMLSelectElement, controlNets, state.controlNet);
        controlNetSelect.addEventListener('change', () => { state.controlNet = controlNetSelect.value; });
        controlRow.append(ctx.ui.field(t('ControlNet 模型', 'ControlNet model'), controlNetSelect));
        extraBox.append(controlRow);
        const strengthRow = ctx.ui.rowbar();
        const strength = ctx.ui.input({ type: 'number', value: String(state.controlStrength ?? 1), cls: 'mono coo-gen-num' }); strength.min='0'; strength.max='2'; strength.step='0.05';
        strength.addEventListener('change', () => { state.controlStrength = Math.min(2, Math.max(0, num(strength.value, 1))); });
        strengthRow.append(ctx.ui.field(t('控制强度', 'Control strength'), strength));
        extraBox.append(strengthRow);
      }
      const denoiseRow = ctx.ui.rowbar();
      const denoise = ctx.ui.input({ type: 'number', value: String(state.denoise ?? (kind === 'img2img' ? 0.6 : 0.7)), cls: 'mono coo-gen-num' }); denoise.min='0.05'; denoise.max='1'; denoise.step='0.05';
      denoise.addEventListener('change', () => { state.denoise = Math.min(1, Math.max(0.05, num(denoise.value, 0.6))); });
      denoiseRow.append(ctx.ui.field(t('重绘幅度', 'Denoise'), denoise));
      extraBox.append(denoiseRow);
    };
    workflowSelect.addEventListener('change', () => {
      state.workflow = workflowSelect.value; state.custom = {};
      renderCheckpointEmpty(); renderExtra(); updateGenerateEnabled();
    });
    void presets.find((item) => item.id === state.workflow);
    renderExtra();

    /* --------------------------- 右栏：连接 + 进度 --------------------------- */
    // 连接卡片化
    const connCard = ctx.ui.h('div', 'coo-conn-card');
    const connHead = ctx.ui.h('div', 'coo-conn-head');
    const connTitle = ctx.ui.h('div', 'coo-conn-title', t('ComfyUI 连接', 'ComfyUI Connection'));
    connTitle.prepend(svgIcon('plug', 16));
    const connBadge = ctx.ui.h('span', 'pill coo-conn-badge', '');
    const dot = ctx.ui.h('span','coo-conn-dot '+(boot.health.ok?'on':'off')); connBadge.append(dot, document.createTextNode(boot.health.ok ? t('在线','Online') : t('离线','Offline')));
    connBadge.style.background = boot.health.ok ? 'rgba(60,180,90,.14)' : 'rgba(220,60,60,.12)';
    connHead.append(connTitle, connBadge);
    const connMeta = ctx.ui.h('div', 'coo-conn-fields');
    let editingUrl = false;
    let savingUrl = false;
    const urlInput = ctx.ui.input({ value: boot.config.url, cls: 'addr-input' });
    const inlineAction = (label: string, handler: () => void): HTMLButtonElement => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'inline-action'; button.textContent = label; button.addEventListener('click', handler); return button;
    };
    const checkBtn = inlineAction(t('检测','Check'), () => { void checkHealth(); });
    const renderConnMeta = (): void => {
      connMeta.replaceChildren();
      const row = (label: string, value: string | HTMLElement, actions: HTMLElement[] = []): HTMLElement => {
        const el = ctx.ui.h('div', 'coo-conn-row');
        const key = ctx.ui.h('span', 'label', label);
        const val = typeof value === 'string' ? ctx.ui.h('span', 'value', value) : value;
        if (typeof value === 'string') val.title = value;
        el.append(key, val, ...actions); return el;
      };
      const edit = inlineAction(t('编辑','Edit'), () => { editingUrl = true; urlInput.value = boot.config.url; renderConnMeta(); urlInput.focus(); });
      const save = inlineAction(t('保存','Save'), () => { void saveAddress(); }); save.disabled = savingUrl;
      const cancel = inlineAction(t('取消','Cancel'), () => { editingUrl = false; renderConnMeta(); }); cancel.disabled = savingUrl;
      const open = inlineAction(t('打开','Open'), () => { void ctx.invoke('openFolder').then(() => ctx.ui.toast(t('已请求打开','Opening'))).catch(e => ctx.ui.toast(errText(e),'bad')); });
      const version = [boot.health.version ? 'v' + boot.health.version : '', boot.health.system ?? ''].filter(Boolean).join(' · ') || '—';
      connMeta.append(row(t('状态','Status'), boot.health.ok ? t('在线','Online') : t('离线','Offline')),
        row(t('版本','Version'), version), row(t('设备','Device'), boot.health.devices?.[0] ?? '—'),
        row(t('地址','URL'), editingUrl ? urlInput : boot.config.url, editingUrl ? [save, cancel] : [edit, checkBtn]),
        row(t('模型','Model'), `Checkpoint ${checkpoints.length} · LoRA ${loras.length}`), row(t('输出','Output'), boot.config.output_dir, [open]));
    };
    const connActions = ctx.ui.h('div', 'coo-conn-actions');
    const launchBtn = ctx.ui.button(t('一键启动','Launch'), { size: 'sm', variant: 'primary' }); launchBtn.disabled = !boot.launch.configured;
    const stopBtn = ctx.ui.button(t('关闭 ComfyUI','Stop ComfyUI'), { size: 'sm', variant: 'plain' }); stopBtn.disabled = !boot.launch.stop_configured;
    stopBtn.style.color = 'var(--danger, #c44)';
    const refreshBtn = ctx.ui.button(t('刷新','Refresh'), { size: 'sm' }); refreshBtn.prepend(svgIcon('refresh',14));
    connActions.append(launchBtn, refreshBtn, stopBtn);
    connCard.append(connHead, connMeta, connActions);
    const healthLine = ctx.ui.msgline(''); // errors are surfaced as toasts rather than extra card rows
    renderConnMeta();
    right.append(connCard);
    right.append(actionFloat);

    const renderHealth = (health: CooGenBootstrap['health']): void => {
      const ok = health.ok;
      connBadge.replaceChildren(); const d=ctx.ui.h('span','coo-conn-dot '+(ok?'on':'off')); connBadge.append(d, document.createTextNode(ok ? t('在线','Online') : t('离线','Offline')));
      connBadge.style.background = ok ? 'rgba(60,180,90,.14)' : 'rgba(220,60,60,.12)';
      healthLine.classList.toggle('bad', !ok);
      healthLine.textContent = ok ? t(`ComfyUI 在线：${health.system ?? health.url}`, `ComfyUI online: ${health.system ?? health.url}`) : t(`ComfyUI 离线：${health.error ?? health.url}`, `ComfyUI offline: ${health.error ?? health.url}`);
      renderConnMeta();
    };

    const applyModelRefresh = (res: { checkpoints: string[]; samplers: string[]; schedulers: string[]; control_nets: string[]; loras: LoRARecord[]; health: CooGenBootstrap['health']; }): void => {
      checkpoints = res.checkpoints; loras = res.loras; controlNets = res.control_nets ?? []; boot.health = res.health;
      shared.checkpoints = checkpoints; shared.loras = loras; shared.controlNets = controlNets;
      setOptions(checkpointSelect, checkpoints, state.checkpoint);
      if (!checkpoints.includes(state.checkpoint)) state.checkpoint = checkpoints[0] ?? state.checkpoint;
      if (checkpoints.length) checkpointSelect.value = state.checkpoint;
      setOptions(samplerSelect as unknown as HTMLSelectElement, res.samplers, state.sampler);
      setOptions(schedulerSelect as unknown as HTMLSelectElement, res.schedulers, state.scheduler);
      renderHealth(res.health); renderLoraTable(); renderCheckpointEmpty();
    };
    const doRefreshModels = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<{ checkpoints: string[]; diffusion_models?: string[]; model_root?: string; samplers: string[]; schedulers: string[]; control_nets: string[]; loras: LoRARecord[]; health: CooGenBootstrap['health']; }>('refreshModels');
        if (!alive) return; applyModelRefresh(res);
      } catch (e) { ctx.ui.toast(t('刷新失败：','Refresh failed: ') + errText(e), 'bad'); }
    };
    const saveAddress = async (): Promise<void> => {
      const value = urlInput.value.trim();
      if (!/^https?:\/\//i.test(value)) { ctx.ui.toast(t('地址要以 http:// 或 https:// 开头','URL must start with http:// or https://'), 'bad'); return; }
      savingUrl = true; renderConnMeta();
      try {
        await ctx.setConfig('world:draw-local', { 'worlds.draw.localUrl': value });
        boot.config.url = value; editingUrl = false; ctx.ui.toast(t('地址已保存','URL saved')); renderConnMeta();
        await checkHealth();
      } catch (e) { ctx.ui.toast(errText(e), 'bad'); }
      finally { savingUrl = false; if (alive) renderConnMeta(); }
    };
    const checkHealth = async (): Promise<void> => {
      try { const res = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health'); if (!alive) return; boot.health = res.health; renderHealth(res.health); if (res.health.ok) await doRefreshModels(); }
      catch (e) { ctx.ui.toast(errText(e), 'bad'); }
    };
    refreshBtn.addEventListener('click', () => { void doRefreshModels(); });
    launchBtn.addEventListener('click', () => {
      void (async () => {
        const busyHandle = ctx.ui.busy(t('启动 ComfyUI','Launching ComfyUI'), t('等待 /system_stats 就绪…','Waiting for /system_stats…'));
        launchBtn.disabled = true; stopBtn.disabled = true;
        try { const res = await ctx.invoke<{ ok: boolean; message: string }>('launch'); if (!alive) return; ctx.ui.toast(res.message, res.ok ? 'ok' : 'bad'); healthLine.classList.toggle('bad', !res.ok); healthLine.textContent = res.message; if (res.ok) await doRefreshModels(); } catch(e){ ctx.ui.toast(errText(e),'bad'); } finally { busyHandle.dispose(); launchBtn.disabled = !boot.launch.configured; stopBtn.disabled = !boot.launch.stop_configured; }
      })();
    });
    stopBtn.addEventListener('click', () => {
      void (async () => {
        const ok = await ctx.ui.confirm({ title: t('确定关闭 ComfyUI？','Close ComfyUI?'), body: t('将执行关闭脚本，正在进行的任务会中断。','The stop script will run and interrupt tasks.'), danger: true });
        if (!ok) return;
        const busyHandle = ctx.ui.busy(t('关闭 ComfyUI','Stopping ComfyUI'), t('正在等待进程退出…','Waiting for process to exit…'));
        stopBtn.disabled = true; launchBtn.disabled = true;
        try { const res = await ctx.invoke<{ ok: boolean; message: string }>('stop'); if (!alive) return; ctx.ui.toast(res.message, res.ok ? 'ok' : 'bad'); healthLine.classList.toggle('bad', !res.ok); healthLine.textContent = res.message; const h = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health'); if (!alive) return; boot.health = h.health; renderHealth(h.health); } catch(e){ ctx.ui.toast(errText(e),'bad'); } finally { busyHandle.dispose(); launchBtn.disabled = !boot.launch.configured; stopBtn.disabled = !boot.launch.stop_configured; }
      })();
    });

    // 进度模块（右栏下方）
    const progressCard = ctx.ui.h('div', 'coo-progress-card is-idle');
    const progressTitle = ctx.ui.h('div', 'coo-group-title', t('生成进度','Progress'));
    const progress: WebUiProgress = ctx.ui.progress({ max: Math.max(1, state.steps), value: 0, label: t('等待开始','Idle'), format: (v,m)=> `${Math.round((v/Math.max(1,m))*100)}%` });
    const stageLine = ctx.ui.msgline(''); stageLine.style.fontSize='12px';
    const progressDetail = ctx.ui.h('div', 'coo-progress-detail', '');
    const previewWrap = ctx.ui.h('div', '');
    const previewImg = ctx.ui.h('img', 'coo-preview-thumb'); previewImg.style.display='none'; previewWrap.append(previewImg);
    const viewWorksBtn = ctx.ui.button(t('查看作品','View works'), { variant: 'primary', size: 'sm' }); viewWorksBtn.prepend(svgIcon('arrowRight',14)); viewWorksBtn.style.display='none';
    viewWorksBtn.addEventListener('click', () => {
      const host = ctx.root.closest('.coo-draw-studio')?.parentElement ?? ctx.root;
      // 通过自定义事件让父容器切换 Tab
      host.dispatchEvent(new CustomEvent('coo-switch-tab', { detail: 'works', bubbles: true }));
      // 兼容器：若父提供 switchTab
      const maybe = ctx as unknown as { switchTab?: (v:string)=>void };
      if (maybe.switchTab) maybe.switchTab('works');
    });
    progressCard.append(progressTitle, progress.el, stageLine, progressDetail, previewWrap, viewWorksBtn);
    right.append(progressCard);

    let startTime: number | null = null;
    const renderTask = (task: GenerateTaskView | null): void => {
      shared.current = task;
      if (!task) {
        progressCard.classList.add('is-idle');
        progress.setValue(0,1); progress.setLabel(t('空闲','Idle')); stageLine.textContent=t('空闲','Idle'); stageLine.style.display=''; progressDetail.textContent=''; progressDetail.style.display='none'; previewImg.style.display='none'; viewWorksBtn.style.display='none';
        generateBtn.disabled = busy; cancelBtn.disabled = true; updateGenerateEnabled(); return;
      }
      progressCard.classList.remove('is-idle');
      stageLine.style.display=''; progressDetail.style.display='';

      const total = Math.max(1, task.progress.total || task.params.steps || 1);
      const cur = task.status === 'done' ? total : Math.min(total, task.progress.current || 0);
      progress.setValue(cur, total); progress.setLabel(task.status==='done'? t('完成','done') : task.status==='error'? t('失败','failed') : task.status==='cancelled'? t('已取消','cancelled') : t('生成中','running'));
      const elapsed = task.finished_at ? Math.round((task.finished_at - task.created_at)/1000) : startTime ? Math.round((Date.now() - startTime)/1000) : Math.round((Date.now() - task.created_at)/1000);
      const estimate = cur>0 && cur<total ? Math.round((elapsed/cur)*(total-cur)) : 0;
      stageLine.textContent = [task.status, task.progress.message ?? '', `${cur}/${total}`, `${elapsed}s`, estimate? t(`预计剩余 ${estimate}s`,`~${estimate}s left`) : '', task.error ?? ''].filter(Boolean).join(' · ');
      stageLine.classList.toggle('bad', task.status==='error');
      progressDetail.textContent = task.status==='running' ? t(`步数：${cur} / ${total}  · 已用：${elapsed}s${estimate ? ` · 预计剩余：${estimate}s` : ''}`, `Step ${cur}/${total} · ${elapsed}s${estimate? ` · ~${estimate}s left` : ''}`) : stageLine.textContent;
      generateBtn.disabled = busy || isActive(task); cancelBtn.disabled = !isActive(task);
      if (task.status==='done') { viewWorksBtn.style.display=''; // 显示跳转
        // 尝试加载预览缩略图（最近一张）
        if (task.images[0]) {
          void ctx.invokeBinary('image', [task.images[0].id]).then(blob=>{
            if (!alive) return; const url = URL.createObjectURL(blob); previewImg.src = url; previewImg.style.display='block';
            previewImg.addEventListener('load', ()=> {}, { once:true });
          }).catch(()=>{});
        }
      } else if (task.status==='running') { viewWorksBtn.style.display='none'; if (!startTime) startTime = Date.now(); }
      else { viewWorksBtn.style.display='none'; }
      updateGenerateEnabled();
    };
    const updateProgressMax = (): void => { if (!current || isActive(current)) {} }; // reserved

    // 历史刷新（供后续完成时调用）
    const refreshHistory = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<HistoryResponse>('history', [Math.max(1, boot.config.history_limit)]);
        if (!alive) return; history = res.history; shared.history = history; shared.current = res.task; current = res.task; renderTask(current); if (current && current.status==='done' && current.id !== lastFinished) { lastFinished = current.id; shared.lastFinished = lastFinished; showTaskResult(current); }
      } catch {}
    };
    const showTaskResult = (task: GenerateTaskView): void => {
      if (task.id === shared.lastFinished) {} // avoid dup but still show
      const entry = history.find((item)=> item.id===task.images[0]?.id);
      if (entry) { shared.resultEntry = entry; resultEntry = entry; // 保存到共享
      }
    };
    const afterTask = async (task: GenerateTaskView): Promise<void> => {
      if (task.id === lastFinished) return; lastFinished = task.id; shared.lastFinished = lastFinished;
      if (task.status==='done') { await refreshHistory(); const ent = history.find(h=> h.id===task.images[0]?.id); if (ent) { shared.resultEntry = ent; } say(t('画好了，已经保存。','Done and saved.')); ctx.ui.toast(t('画好了','Done')); // 自动在右栏显示预览已在 renderTask 处理
      } else if (task.status==='error') { say(task.error ?? t('出图失败','Generation failed'), true); ctx.ui.toast(t('出图失败','Generation failed'),'bad'); }
      else if (task.status==='cancelled') say(t('已取消。','Cancelled.'));
    };
    const poll = async (): Promise<void> => {
      if (!current || !isActive(current)) return;
      try { const res = await ctx.invoke<StatusResponse>('status'); if (!alive) return; current=res.task; renderTask(current); if (current && !isActive(current)) await afterTask(current); } catch {}
    };
    ctx.interval(()=>{ void poll(); }, 800);
    async function generate(): Promise<void> {
      if (busy) return;
      if (isActive(current)) { say(t('上一张还在画，等它完成或点取消。','Previous picture still running; wait or cancel.')); return; }
      if (!state.positive.trim()) { say(t('先写正向提示词。','Write a positive prompt first.'), true); positive.focus(); return; }
      // checkpoint 校验
      if (!state.checkpoint && checkpoints.length>0) { say(t('请先选择 Checkpoint 模型','Select a checkpoint first'), true); return; }
      if (checkpoints.length===0) {
        const preset = presets.find(p=>p.id===state.workflow);
        const needs = ['quick-txt2img','quick-img2img','quick-controlnet'].includes(state.workflow) || preset?.kind==='txt2img' || preset?.kind==='img2img' || preset?.kind==='controlnet';
        if (needs) { say(t('未检测到 Checkpoint，无法生成。请先放入模型并刷新。','No checkpoint detected; put model files and refresh.'), true); return; }
      }
      busy=true; generateBtn.disabled=true; say(t('正在提交…','Submitting…')); startTime=Date.now();
      try {
        const res = await ctx.invoke<GenerateResponse>('generate', [collect()]);
        if (!alive) return;
        if (!res.ok || !res.task) { say(res.error ?? t('提交失败','Submit failed'), true); return; }
        current=res.task; shared.current=current; lastFinished=''; shared.lastFinished=''; renderTask(current); persistLora();
        if (res.warnings?.length) say(res.warnings.join('；'), false); else say(t('已提交，等待 ComfyUI…','Submitted; waiting for ComfyUI…'));
        void refreshHistory();
      } catch(e){ say(errText(e), true); } finally { busy=false; generateBtn.disabled=isActive(current); updateGenerateEnabled(); }
    }
    generateBtn.addEventListener('click', ()=>{ void generate(); });
    cancelBtn.addEventListener('click', ()=> {
      if (!current) return;
      void (async ()=>{ try { await ctx.invoke('cancel', [current?.id]); ctx.ui.toast(t('已请求取消','Cancel requested')); const res=await ctx.invoke<StatusResponse>('status'); if (!alive) return; current=res.task; shared.current=current; renderTask(current); } catch(e){ say(errText(e), true); } })();
    });
    renderTask(current);
    if (current && isActive(current)) void poll();
  },
};

/* ------------------------------------------------------------------ works */

const worksPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    let alive = true; ctx.own({ dispose: ()=>{ alive=false; } });

    let boot: CooGenBootstrap;
    try { boot = await ctx.invoke<CooGenBootstrap>('bootstrap'); } catch(e){
      const sheet = ctx.ui.sheet({ title: t('作品','Works') }); sheet.body.append(ctx.ui.msgline(t('读取失败：','Failed: ')+errText(e), true)); ctx.root.append(sheet.el); return;
    }
    if (!alive) return;

    // 初始历史
    let allHistory: HistoryEntry[] = shared.history.length ? shared.history : boot.history;
    shared.history = allHistory;
    let pageLimit = Math.max(50, boot.config.history_limit);
    const fetchHistory = async (limit = pageLimit): Promise<void> => {
      try {
        const res = await ctx.invoke<HistoryResponse>('history', [limit]);
        if (!alive) return; allHistory = res.history; shared.history = allHistory; refreshModelOptions(); refreshLoraFilterOptions(); renderGallery();
        if (res.task) { shared.current = res.task; }
      } catch {}
    };

    // ===== 本地持久化 =====
    const VIEWED_KEY = 'coo-works-viewed';
    const FIELD_KEY = 'coo-works-fields';
    const loadViewed = (): Set<string> => { try { const raw=localStorage.getItem(VIEWED_KEY); return new Set(raw? JSON.parse(raw) as string[]: []); } catch { return new Set(); } };
    const saveViewed = (s:Set<string>): void => { try{ localStorage.setItem(VIEWED_KEY, JSON.stringify([...s])); }catch{} };
    let viewed = loadViewed();
    const markViewed = (id:string): void => { if (!viewed.has(id)) { viewed.add(id); saveViewed(viewed); dispatchUnread(); } };
    const dispatchUnread = (): void => {
      const unread = allHistory.filter(h=> !viewed.has(h.id)).length;
      // 通知父 Tab 显示红点
      ctx.root.dispatchEvent(new CustomEvent('coo-works-unread', { detail: unread, bubbles: true }));
      // 兼容直接操作 segmented 按钮（fallback）
      try {
        const host = ctx.root.closest('.coo-draw-studio')?.parentElement ?? document.body;
        const seg = host.parentElement?.querySelector('[role="tablist"], .segmented') || host.querySelector('.segmented');
        if (seg) {
          let dot = seg.querySelector('.coo-tab-dot') as HTMLElement | null;
          if (unread>0) { if (!dot) { dot=document.createElement('span'); dot.className='coo-tab-dot'; const btn=Array.from(seg.querySelectorAll('button')).find(b=> b.textContent?.includes(t('作品','Works'))); if (btn) btn.append(dot); else (seg as HTMLElement).append(dot); } }
          else if (dot) dot.remove();
        }
      } catch {}
    };

    // 字段配置
    type FieldId = 'filename'|'seed'|'size'|'lora'|'model'|'time'|'sampler'|'prompt'|'negative';
    const DEFAULT_FIELDS: Array<{ id: FieldId; labelZh: string; labelEn: string }> = [
      { id:'prompt', labelZh:'提示词', labelEn:'Prompt' },
      { id:'negative', labelZh:'反向', labelEn:'Negative' },
      { id:'seed', labelZh:'种子', labelEn:'Seed' },
      { id:'lora', labelZh:'LoRA', labelEn:'LoRA' },
      { id:'model', labelZh:'模型', labelEn:'Model' },
      { id:'size', labelZh:'尺寸', labelEn:'Size' },
      { id:'sampler', labelZh:'采样参数', labelEn:'Sampler' },
      { id:'time', labelZh:'时间', labelEn:'Time' },
      { id:'filename', labelZh:'文件名', labelEn:'Filename' },
    ];
    const loadFieldConfig = (): { order: FieldId[]; hidden: Set<string> } => {
      try {
        const raw = localStorage.getItem(FIELD_KEY);
        if (raw) {
          const o = JSON.parse(raw) as { order?: string[]; hidden?: string[] };
          const order = (o.order?.filter(x=> DEFAULT_FIELDS.some(f=>f.id===x)) as FieldId[]) ?? DEFAULT_FIELDS.map(f=>f.id);
          // 补全新增字段
          for (const f of DEFAULT_FIELDS) if (!order.includes(f.id)) order.push(f.id);
          return { order, hidden: new Set(o.hidden ?? []) };
        }
      } catch {}
      return { order: DEFAULT_FIELDS.map(f=>f.id), hidden: new Set() };
    };
    let fieldConfig = loadFieldConfig();
    const saveFieldConfig = (): void => { try{ localStorage.setItem(FIELD_KEY, JSON.stringify({ order: fieldConfig.order, hidden: [...fieldConfig.hidden] })); }catch{} };

    const root = ctx.ui.h('div', 'coo-works');
    const left = ctx.ui.h('div', 'coo-works-gallery');
    const right = ctx.ui.h('div', 'coo-works-detail');
    root.append(left, right);
    ctx.root.append(root);

    // ===== 筛选区（两行重构）=====
    const filters = ctx.ui.h('div', 'coo-works-filters');
    const row1 = ctx.ui.h('div', 'coo-works-filters-row coo-works-filters-row1');
    const row2 = ctx.ui.h('div', 'coo-works-filters-row coo-works-filters-row2');
    filters.append(row1, row2);

    // 搜索框：外层统一边框，内层 input 去边框，保证与其它控件严格等高
    const searchWrap = ctx.ui.h('div', 'coo-filter-search');
    const searchInput = ctx.ui.input({ type: 'search', placeholder: t('搜索提示词 / 种子 / 文件名','Search prompt / seed / filename') }) as HTMLInputElement;
    searchWrap.append(searchInput);

    // 日期范围：自定义月历弹层（不使用原生 date input）
    // 第八轮确认：默认单月（双月并排仍可用 months: 2，但作品页不启用）
    const datePicker: DateRangePickerHandle = createDateRangePicker({
      t,
      className: 'coo-filter-date',
      months: 1,
      onChange: () => renderGallery(),
    });
    row1.append(searchWrap, datePicker.el);
    // 面板卸载时收起所有弹层，移除挂在 document 上的监听
    ctx.own({ dispose: () => { closeAllPopovers(); datePicker.destroy(); } });

    // 模型筛选：自定义 ul/li 下拉，杜绝原生 select 的系统蓝 Hover
    const modelDD = createDropdown({
      className: 'coo-filter-model',
      ariaLabel: t('模型筛选','Filter by model'),
      options: [{ value: '', label: t('全部模型','All models') }],
      onChange: () => renderGallery(),
    });

    // LoRA 多选弹层（同样是 ul/li，内部搜索框单独规范尺寸）
    let loraFilterSelected = new Set<string>();
    const loraFilterWrap = ctx.ui.h('div', 'coo-filter-lora coo-dd');
    const loraFilterBtn = document.createElement('button');
    loraFilterBtn.type = 'button';
    loraFilterBtn.className = 'coo-dd-trigger';
    loraFilterBtn.setAttribute('aria-haspopup', 'listbox');
    loraFilterBtn.setAttribute('aria-expanded', 'false');
    loraFilterBtn.setAttribute('aria-label', t('LoRA 筛选','Filter by LoRA'));
    const loraBtnLabel = ctx.ui.h('span', 'coo-dd-value', t('全部 LoRA','All LoRAs'));
    loraFilterBtn.append(loraBtnLabel, createCaretIcon());
    const loraFilterPanel = ctx.ui.h('div', 'coo-lora-dropdown-panel');
    loraFilterPanel.hidden = true;
    loraFilterWrap.append(loraFilterBtn, loraFilterPanel);

    // 排序：两个自定义下拉 + label
    const sortLabel = ctx.ui.h('span', 'coo-filter-sort-label', t('排序:','Sort:'));
    const sortElement = createDropdown({
      className: 'coo-filter-sort-field',
      ariaLabel: t('排序字段','Sort field'),
      options: [
        { value: 'time', label: t('时间','Time') },
        { value: 'size', label: t('尺寸','Size') },
        { value: 'filename', label: t('文件名','Filename') },
      ],
      value: 'time',
      onChange: () => renderGallery(),
    });
    const sortDir = createDropdown({
      className: 'coo-filter-sort-dir',
      ariaLabel: t('排序方向','Sort direction'),
      options: [
        { value: 'desc', label: t('降序','Desc') },
        { value: 'asc', label: t('升序','Asc') },
      ],
      value: 'desc',
      onChange: () => renderGallery(),
    });
    const sortWrap = ctx.ui.h('div', 'coo-filter-sort');
    sortWrap.append(sortLabel, sortElement.el, sortDir.el);

    const clearBtn = ctx.ui.button(t('清除筛选','Clear'), { size: 'sm', variant: 'plain' });
    clearBtn.classList.add('coo-filter-clear');
    clearBtn.style.display = 'none';

    row2.append(modelDD.el, loraFilterWrap, sortWrap, clearBtn);
    left.append(filters);

    // 填充模型下拉（保留当前选中值）
    const refreshModelOptions = (): void => {
      const models = [...new Set(allHistory.map(h=>h.checkpoint).filter(Boolean))].sort();
      modelDD.setOptions([
        { value: '', label: t('全部模型','All models') },
        ...models.map((m) => ({ value: m, label: stripExt(m) })),
      ]);
    };
    refreshModelOptions();

    // LoRA 筛选选项
    const allLorasInLib = (): Array<{ path:string; name:string }> => {
      const map = new Map<string, string>();
      for (const h of allHistory) for (const l of h.loras) if (!map.has(l.path)) map.set(l.path, stripExt(l.name));
      if (!map.size && boot.loras) for (const l of boot.loras) if (!map.has(l.path)) map.set(l.path, stripExt(l.name));
      return [...map.entries()].map(([path,name])=>({ path, name })).sort((a,b)=> a.name.localeCompare(b.name));
    };
    const updateLoraBtn = (): void => {
      loraBtnLabel.textContent = loraFilterSelected.size
        ? t(`${loraFilterSelected.size} 个 LoRA`, `${loraFilterSelected.size} LoRAs`)
        : t('全部 LoRA','All LoRAs');
      loraBtnLabel.classList.toggle('is-placeholder', !loraFilterSelected.size);
    };
    const refreshLoraFilterOptions = (): void => {
      const list = allLorasInLib();
      loraFilterPanel.replaceChildren();
      // 内部搜索框：比外部触发器更轻量（32px / 13px / 单像素 focus 环）
      const searchWrapInner = ctx.ui.h('div', 'lora-dropdown-search-wrapper');
      const searchBox = document.createElement('input');
      searchBox.type = 'search';
      searchBox.className = 'lora-dropdown-search-input';
      searchBox.placeholder = t('搜索 LoRA...','Search LoRA...');
      searchWrapInner.append(searchBox);
      // ul/li 列表
      const listWrap = document.createElement('ul');
      listWrap.className = 'coo-dd-list coo-lora-list';
      listWrap.setAttribute('role', 'listbox');
      listWrap.setAttribute('aria-multiselectable', 'true');
      const actions = ctx.ui.h('div', 'lora-dropdown-actions');
      const clear = document.createElement('button');
      clear.type = 'button'; clear.className = 'btn-action default'; clear.textContent = t('清空','Clear');
      clear.addEventListener('click', () => {
        loraFilterSelected.clear();
        renderList(searchBox.value);
        updateLoraBtn();
        renderGallery();
      });
      const ok = document.createElement('button');
      ok.type = 'button'; ok.className = 'btn-action primary'; ok.textContent = t('确定','Confirm');
      ok.addEventListener('click', () => closeLora());
      actions.append(clear, ok);
      loraFilterPanel.append(searchWrapInner, listWrap, actions);

      const renderList = (filterText: string): void => {
        listWrap.replaceChildren();
        const allRow = document.createElement('li');
        allRow.className = 'coo-dd-option';
        allRow.tabIndex = -1;
        const allChk = document.createElement('input');
        allChk.type = 'checkbox'; allChk.checked = !loraFilterSelected.size; allChk.tabIndex = -1;
        const allLab = ctx.ui.h('span', 'coo-dd-option-label', t('全部','All'));
        allRow.append(allChk, allLab);
        allRow.addEventListener('click', () => {
          loraFilterSelected.clear();
          updateLoraBtn();
          closeLora();
          renderGallery();
        });
        listWrap.append(allRow);

        const q = filterText.trim().toLowerCase();
        for (const item of list) {
          if (q && !item.name.toLowerCase().includes(q) && !item.path.toLowerCase().includes(q)) continue;
          const row = document.createElement('li');
          row.className = 'coo-dd-option';
          row.tabIndex = -1;
          row.title = item.path;
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = loraFilterSelected.has(item.path);
          chk.tabIndex = -1;
          const lab = ctx.ui.h('span', 'coo-dd-option-label', item.name);
          row.append(chk, lab);
          row.addEventListener('click', (event) => {
            if (event.target !== chk) chk.checked = !chk.checked;
            if (chk.checked) loraFilterSelected.add(item.path);
            else loraFilterSelected.delete(item.path);
            updateLoraBtn();
            renderGallery();
          });
          listWrap.append(row);
        }
        if (!list.length) listWrap.append(ctx.ui.msgline(t('暂无','Empty'), false));
      };
      renderList('');
      searchBox.addEventListener('input', () => renderList(searchBox.value));
      updateLoraBtn();
    };
    const closeLora = (): void => {
      loraFilterPanel.hidden = true;
      loraFilterBtn.setAttribute('aria-expanded', 'false');
      loraFilterWrap.classList.remove('is-open');
      closePopover(closeLora);
      document.removeEventListener('mousedown', onLoraOutside, true);
    };
    function onLoraOutside(event: MouseEvent): void {
      if (!loraFilterWrap.contains(event.target as Node)) closeLora();
    }
    loraFilterBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!loraFilterPanel.hidden) { closeLora(); return; }
      openPopover(closeLora);
      refreshLoraFilterOptions();
      loraFilterPanel.hidden = false;
      loraFilterBtn.setAttribute('aria-expanded', 'true');
      loraFilterWrap.classList.add('is-open');
      document.addEventListener('mousedown', onLoraOutside, true);
    });
    loraFilterPanel.addEventListener('mousedown', (event) => event.stopPropagation());
    updateLoraBtn();
    // 统计行（筛选区下方、画廊上方）- 共X张 | 筛选出X/共Z + [批量模式] outline 32px
    const statsRow = ctx.ui.h('div','coo-works-stats');
    const statsText = ctx.ui.h('span','', '');
    const statsActions = ctx.ui.h('div','coo-batch-bar');
    const batchToggle = document.createElement('button');
    batchToggle.type = 'button';
    batchToggle.className = 'btn-batch-mode';
    const batchToggleIcon = svgIcon('checkbox', 14);
    const batchToggleLabel = ctx.ui.h('span','', t('批量模式','Batch'));
    batchToggle.append(batchToggleIcon, batchToggleLabel);
    statsActions.append(batchToggle);
    statsRow.append(statsText, statsActions);
    left.append(statsRow);

    const grid = ctx.ui.h('div', 'coo-works-grid');
    const loadMoreBtn = ctx.ui.button(t('加载更多','Load more'), { size: 'sm' });
    loadMoreBtn.style.display = allHistory.length >= pageLimit ? '' : 'none';
    left.append(grid, loadMoreBtn);

    // 批量状态
    let batchMode = false;
    const selected = new Set<string>();
    // 缩略图缓存：id -> objectURL
    const thumbCache = new Map<string, string>();
    ctx.own({ dispose: ()=>{ for(const u of thumbCache.values()) URL.revokeObjectURL(u); }});

    // 右栏：对比提示条
    const compareBar = ctx.ui.h('div','coo-compare-bar'); compareBar.style.display='none';
    const compareTip = ctx.ui.h('span','', '');
    const cancelCompare = ctx.ui.button(t('取消对比','Cancel'), { size:'sm' });
    compareBar.append(compareTip, cancelCompare);
    right.append(compareBar);

    // 右栏预览区 - 预置灰背景，切换时旧图保留
    const previewWrap = ctx.ui.h('div','coo-works-preview-wrap'); previewWrap.style.display='none';
    const preview = document.createElement('img'); preview.alt=''; preview.style.display='block'; preview.style.transition='opacity 150ms';
    const previewNext = document.createElement('img'); previewNext.alt=''; previewNext.style.display='none'; previewNext.style.position='absolute'; previewNext.style.inset='0'; previewNext.style.width='100%'; previewNext.style.height='100%'; previewNext.style.objectFit='contain'; previewNext.style.transition='opacity 150ms';
    const overlay = ctx.ui.h('div','coo-preview-overlay', t('点击查看原图','Click to view original'));
    previewWrap.append(preview, previewNext, overlay);
    const empty = ctx.ui.placeholder(t('点击左侧缩略图查看大图与操作','Click a thumbnail to view details'));
    // 空状态容器（无作品 / 筛选无结果）
    const emptyState = ctx.ui.h('div','coo-works-empty'); emptyState.style.display='none';
    const emptyTitle = ctx.ui.h('div','title','');
    const emptySub = ctx.ui.h('div','sub','');
    const emptyAction = ctx.ui.h('div',''); emptyState.append(emptyTitle, emptySub, emptyAction);
    right.append(previewWrap, empty);
    // 左栏也可能显示空状态（筛选无结果时在画廊区提示）
    left.append(emptyState);

    // 元信息卡片
    const metaCard = ctx.ui.h('div','coo-meta-card');
    const metaHead = ctx.ui.h('div','coo-meta-head');
    const metaTitle = ctx.ui.h('div','coo-meta-title', t('元信息','Metadata'));
    const fieldBtn = document.createElement('button'); fieldBtn.className='coo-info-btn'; fieldBtn.title=t('字段设置','Fields');
    fieldBtn.style.width='16px'; fieldBtn.style.height='16px'; fieldBtn.style.marginLeft='4px'; fieldBtn.style.flexShrink='0';
    fieldBtn.append(svgIcon('gear', 16));
    metaHead.append(metaTitle, fieldBtn);
    const metaGrid = ctx.ui.h('div', 'coo-meta-grid');
    metaCard.append(metaHead, metaGrid);
    // 字段设置面板 - 标题 元信息字段设置，行 [handle][Switch] name 拖拽排序
    const fieldPanel = ctx.ui.h('div','coo-field-settings'); fieldPanel.style.display='none';
    fieldPanel.style.minWidth='280px';
    const buildFieldPanel = (): void => {
      fieldPanel.replaceChildren();
      const title = ctx.ui.h('div','', t('元信息字段设置','Metadata Fields')); title.style.fontWeight='600'; title.style.fontSize='13px'; title.style.marginBottom='8px';
      fieldPanel.append(title);
      let dragSrc: number | null = null;
      for (let i=0;i<fieldConfig.order.length;i++) {
        const id = fieldConfig.order[i]!;
        const def = DEFAULT_FIELDS.find(f=>f.id===id)!;
        const row = ctx.ui.h('div','item'); row.draggable=true; row.style.display='flex'; row.style.alignItems='center'; row.style.gap='8px'; row.style.padding='6px 0';
        // handle
        const handle = ctx.ui.h('span','', '☰'); handle.style.cursor='grab'; handle.style.opacity='.5';
        // Switch (styled checkbox)
        const sw = document.createElement('input'); sw.type='checkbox'; sw.checked = !fieldConfig.hidden.has(id); sw.style.width='32px'; sw.style.height='18px';
        sw.addEventListener('change', ()=>{ if (sw.checked) fieldConfig.hidden.delete(id); else fieldConfig.hidden.add(id); });
        const lab = ctx.ui.h('span','', zh?def.labelZh:def.labelEn); lab.style.flex='1';
        row.append(handle, sw, lab);
        row.addEventListener('dragstart', ()=>{ dragSrc=i; });
        row.addEventListener('dragover', (e)=>{ e.preventDefault(); });
        row.addEventListener('drop', (e)=>{ e.preventDefault(); if (dragSrc===null || dragSrc===i) return; const moved = fieldConfig.order.splice(dragSrc,1)[0]!; fieldConfig.order.splice(i,0,moved); buildFieldPanel(); });
        fieldPanel.append(row);
      }
      const actions = ctx.ui.h('div',''); actions.style.display='flex'; actions.style.gap='6px'; actions.style.justifyContent='flex-end'; actions.style.marginTop='8px';
      const reset = ctx.ui.button(t('恢复默认','Reset'), { size:'sm' });
      reset.addEventListener('click', ()=>{ fieldConfig = { order: DEFAULT_FIELDS.map(f=>f.id), hidden: new Set() }; saveFieldConfig(); buildFieldPanel(); renderMeta(activeEntry); });
      const cancel = ctx.ui.button(t('取消','Cancel'), { size:'sm' });
      cancel.addEventListener('click', ()=>{ fieldPanel.style.display='none'; fieldConfig = loadFieldConfig(); buildFieldPanel(); });
      const save = ctx.ui.button(t('保存','Save'), { size:'sm', variant:'primary' });
      save.addEventListener('click', ()=>{ saveFieldConfig(); fieldPanel.style.display='none'; renderMeta(activeEntry); });
      actions.append(reset, cancel, save); fieldPanel.append(actions);
    };
    buildFieldPanel();
    metaHead.style.position='relative'; metaHead.append(fieldPanel);
    fieldBtn.addEventListener('click', (e)=>{ e.stopPropagation(); fieldPanel.style.display = fieldPanel.style.display==='none' ? 'block' : 'none'; });
    document.addEventListener('click', (e)=>{ if (!metaHead.contains(e.target as Node)) fieldPanel.style.display='none'; });

    // 操作卡片：统一 flex 换行网格 + 标准按钮（.operations-panel / .btn-action）
    const opsCard = ctx.ui.h('div','coo-meta-card');
    const opsTitle = ctx.ui.h('div','coo-meta-title', t('操作','Actions'));
    const opsPanel = ctx.ui.h('div','operations-panel');
    opsCard.append(opsTitle, opsPanel);
    right.append(metaCard, opsCard);

    // 批量操作栏（替代详情）- 已选3张 [全选][反选] [批量删除][批量导出] sticky
    const batchBar = ctx.ui.h('div','coo-works-batch-actions'); batchBar.style.display='none';
    batchBar.style.position='sticky'; batchBar.style.bottom='0'; batchBar.style.background='#fff';
    const batchCount = ctx.ui.h('span','', '');
    const batchAll = ctx.ui.button(t('全选','Select all'), { size:'sm' });
    const batchInverse = ctx.ui.button(t('反选','Invert'), { size:'sm' });
    const batchDel = ctx.ui.button(t('批量删除','Delete selected'), { size:'sm', variant:'plain' }); batchDel.style.color='var(--coo-danger)';
    const batchExport = ctx.ui.button(t('批量导出','Export'), { size:'sm' });
    batchBar.append(batchCount, batchAll, batchInverse, batchDel, batchExport);
    right.append(batchBar);

    let activeEntry: HistoryEntry | null = shared.resultEntry ?? allHistory[0] ?? null;
    let activePreviewUrl = '';
    let compareA: HistoryEntry | null = null;
    let compareB: HistoryEntry | null = null;
    let compareMode = false;
    ctx.own({ dispose: ()=>{ if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl); } });
    const imageUrls: string[] = []; ctx.own({ dispose: ()=>{ for(const u of imageUrls) URL.revokeObjectURL(u); } });

    const openLightbox = (src:string, filename:string): void => {
      const box = ctx.ui.h('div','coo-lightbox');
      const img = document.createElement('img'); img.src=src; img.alt=filename;
      const close = ctx.ui.h('button','close','×'); close.addEventListener('click', ()=> box.remove());
      box.append(img, close);
      box.addEventListener('click', (e)=>{ if (e.target===box) box.remove(); });
      const onKey = (e:KeyboardEvent)=>{ if (e.key==='Escape') { box.remove(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
      document.body.append(box);
    };
    previewWrap.addEventListener('click', ()=>{ if (preview.src) openLightbox(preview.src, activeEntry?.filename ?? ''); });

    const renderMeta = (entry: HistoryEntry | null): void => {
      metaGrid.replaceChildren();
      if (!entry) { metaGrid.append(ctx.ui.msgline(t('请选择一张图','Select a picture'))); return; }
      const addRow = (id: FieldId, label: string, valueEl: HTMLElement | string, copyVal?: string, placeholder?: string): void => {
        if (fieldConfig.hidden.has(id)) return;
        const row = ctx.ui.h('div','coo-meta-row');
        const isMultiline = id==='prompt' || id==='negative' || id==='lora';
        if (isMultiline) row.classList.add('coo-meta-row--multiline');
        const kk = ctx.ui.h('div','k', label);
        const vv = ctx.ui.h('div','v');
        if (typeof valueEl==='string') {
          if (!valueEl && placeholder) { const ph=ctx.ui.h('span','placeholder', placeholder); vv.append(ph); }
          else vv.textContent = valueEl;
        } else vv.append(valueEl);
        row.append(kk, vv);
        if (copyVal) {
          const copy = ctx.ui.copyButton(()=>copyVal, { size:'sm', label: t('复制','Copy') });
          copy.classList.add('copy-btn');
          row.append(copy);
        }
        metaGrid.append(row);
      };
      // 文件名
      addRow('filename', t('文件名','File'), entry.filename, entry.filename);
      // 种子
      addRow('seed', t('种子','Seed'), String(entry.seed), String(entry.seed));
      // 尺寸
      addRow('size', t('尺寸','Size'), `${entry.width}×${entry.height}`);
      // LoRA chips
      {
        if (!fieldConfig.hidden.has('lora')) {
          const row = ctx.ui.h('div','coo-meta-row coo-meta-row--multiline');
          const kk = ctx.ui.h('div','k','LoRA');
          const vv = ctx.ui.h('div','v');
          if (!entry.loras.length) { const ph=ctx.ui.h('span','placeholder', t('未使用','Not used')); vv.append(ph); }
          else {
            const chips = ctx.ui.h('div','coo-lora-chips');
            for (const l of entry.loras) {
              const chip = ctx.ui.h('div','coo-lora-chip');
              const name = stripExt(l.name);
              const txt = document.createElement('span'); txt.textContent = name; txt.title = l.path;
              const dot = document.createElement('span'); dot.textContent='·'; dot.className='weight';
              const w = document.createElement('span'); w.textContent = String(l.weight); w.className='weight';
              chip.append(txt, dot, w);
              chip.title = `${l.path} · ${l.weight}`;
              chips.append(chip);
            }
            vv.append(chips);
          }
          row.append(kk, vv);
          metaGrid.append(row);
        }
      }
      // 模型（空占位）
      addRow('model', t('模型','Model'), entry.checkpoint ? stripExt(entry.checkpoint) : '', entry.checkpoint || undefined, t('未使用','Not used'));
      // 时间
      addRow('time', t('时间','Time'), shortDate(entry.created_at));
      // 采样参数
      addRow('sampler', t('采样参数','Sampler'), `${entry.sampler} · ${entry.scheduler} · ${t('步数','Steps')} ${entry.steps} · CFG ${entry.cfg}`);
      // 提示词（无折叠，自动换行）
      {
        if (!fieldConfig.hidden.has('prompt')) {
          const row = ctx.ui.h('div','coo-meta-row coo-meta-row--multiline');
          const kk = ctx.ui.h('div','k', t('提示词','Prompt'));
          const vv = ctx.ui.h('div','v', entry.positive);
          vv.style.whiteSpace='pre-wrap';
          row.append(kk, vv);
          const copy = ctx.ui.copyButton(()=>entry.positive, { size:'sm', label: t('复制','Copy') }); copy.classList.add('copy-btn'); row.append(copy);
          metaGrid.append(row);
        }
      }
      // 反向
      {
        if (!entry.negative && fieldConfig.hidden.has('negative')) { /* skip */ }
        else if (!fieldConfig.hidden.has('negative')) {
          const row = ctx.ui.h('div','coo-meta-row coo-meta-row--multiline');
          const kk = ctx.ui.h('div','k', t('反向','Negative'));
          const vv = ctx.ui.h('div','v');
          if (!entry.negative) { const ph=ctx.ui.h('span','placeholder', t('未使用','Not used')); vv.append(ph); }
          else { vv.textContent = entry.negative; vv.style.whiteSpace='pre-wrap'; }
          row.append(kk, vv);
          if (entry.negative) { const copy = ctx.ui.copyButton(()=>entry.negative, { size:'sm', label: t('复制','Copy') }); copy.classList.add('copy-btn'); row.append(copy); }
          metaGrid.append(row);
        }
      }
      // 按 order 重新排序：目前已按 DEFAULT_FIELDS 顺序追加，若用户自定义顺序需重排
      // 由于我们按顺序 addRow，已天然遵循 fieldConfig.order（上面循环是按 DEFAULT_FIELDS 写死，需改为按 order 遍历）
      // 为简单起见，重排子节点：
      const desired = fieldConfig.order.filter(id=> !fieldConfig.hidden.has(id));
      // 当前 metaGrid 子节点顺序与 desired 对应，上面实现已按固定顺序，需用映射重排
      // 重新构建：收集所有行按 id 索引
      // 便于实现，我们改为：先收集所有行 DOM，再按 order 排序
      // 以上已按硬编码顺序加入，重排如下
      const rows = Array.from(metaGrid.children) as HTMLElement[];
      // 映射 id 到 row：通过标题文本匹配（k 内容）
      const labelMap: Record<string, HTMLElement> = {};
      for (const r of rows) { const kEl = r.querySelector('.k'); if (kEl) labelMap[kEl.textContent?.trim() ?? ''] = r; }
      // 由于标签可能本地化，直接按 desired 的标签顺序重排
      const idToLabel: Record<FieldId,string> = { filename: t('文件名','File'), seed: t('种子','Seed'), size: t('尺寸','Size'), lora:'LoRA', model: t('模型','Model'), time: t('时间','Time'), sampler: t('采样参数','Sampler'), prompt: t('提示词','Prompt'), negative: t('反向','Negative') };
      const ordered: HTMLElement[] = [];
      for (const id of desired) { const lbl = idToLabel[id]; const el = labelMap[lbl]; if (el) ordered.push(el); }
      // 追加未匹配（防止遗漏）
      for (const r of rows) if (!ordered.includes(r)) ordered.push(r);
      metaGrid.replaceChildren(...ordered);
    };

    /** 统一按钮工厂：图标 + 文本，图标不随文案更新丢失。 */
    const opButton = (label: string, variant: 'primary' | 'default' | 'danger', icon: string): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn-action ${variant}`;
      const text = document.createElement('span');
      text.textContent = label;
      button.append(svgIcon(icon, 14), text);
      (button as unknown as { _label: HTMLElement })._label = text;
      return button;
    };

    const buildOps = (entry: HistoryEntry | null): void => {
      opsPanel.replaceChildren();
      if (!entry) { opsPanel.append(ctx.ui.msgline(t('请选择一张图','Select a picture'))); return; }

      const redraw = opButton(t('重画','Repaint'), 'primary', 'refresh');
      redraw.addEventListener('click', ()=>{
        (window as any).__coo_draw_repaint = { entry, mode: 'sameSeed' };
        ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab', { detail: 'studio', bubbles: true })); const m = ctx as unknown as { switchTab?: (v:string)=>void }; if (m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('已切换到出图页，将用相同参数重画','Switched to Studio; repaint with same seed'));
      });
      const tweak = opButton(t('微调','Tweak'), 'default', 'sliders');
      tweak.addEventListener('click', ()=>{
        (window as any).__coo_draw_repaint = { entry, mode: 'randomSeed' }; ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab', { detail:'studio', bubbles:true })); const m=ctx as unknown as {switchTab?:(v:string)=>void}; if(m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('已切换到出图页，种子将随机','Switched to Studio; seed randomized'));
      });
      const useAll = opButton(t('使用全部参数','Use all params'), 'default', 'layers');
      useAll.addEventListener('click', ()=>{
        (window as any).__coo_draw_repaint = { entry, mode: 'useAll' }; ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab',{detail:'studio',bubbles:true})); const m=ctx as unknown as {switchTab?:(v:string)=>void}; if(m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('参数已回填到出图页','Params filled to Studio'));
      });

      const copySeed = ctx.ui.copyButton(()=>String(entry.seed), { label: t('复制种子','Copy seed'), size:'sm' });
      copySeed.classList.add('btn-action', 'default');
      copySeed.prepend(svgIcon('copy', 14));

      const toPet = opButton(t('发送到桌宠','Send to pet'), 'default', 'send');
      toPet.addEventListener('click', ()=>{ void ctx.invoke('sendToPet', [entry.id]).then(res=>ctx.ui.toast((res as any).message, (res as any).ok?'ok':'bad')).catch(e=>ctx.ui.toast(errText(e),'bad')); });

      const compare = opButton(t('对比','Compare'), 'default', 'compare');
      compare.addEventListener('click', ()=>{ enterCompare(entry); });

      const openFolder = opButton(t('打开文件夹','Open folder'), 'default', 'folder');
      openFolder.addEventListener('click', ()=>{ void ctx.invoke('revealImage', [entry.id]).then(()=>ctx.ui.toast(t('已请求在文件管理器中显示','Revealing in file manager'))).catch(()=> void ctx.invoke('openFolder').then(()=>ctx.ui.toast(t('已请求打开文件夹','Opening folder'))).catch(e=>ctx.ui.toast(errText(e),'bad'))); });

      const fav = opButton(t('收藏','Favorite'), 'default', 'star');
      fav.setAttribute('aria-pressed', 'false');
      fav.addEventListener('click', ()=>{
        const badge = (fav as unknown as { _label: HTMLElement })._label;
        const on = fav.getAttribute('aria-pressed') === 'true';
        fav.setAttribute('aria-pressed', String(!on));
        fav.classList.toggle('is-active', !on);
        badge.textContent = on ? t('收藏','Favorite') : t('已收藏','Favorited');
        ctx.ui.toast(on ? t('已取消收藏（本地标记）','Unfavorited') : t('已收藏（本地标记）','Favorited'));
      });

      const del = opButton(t('删除','Delete'), 'danger', 'trash');
      del.addEventListener('click', async ()=>{
        const ok=await ctx.ui.confirm({ title: t('删除这张？','Delete this?'), body: t('确定删除这张作品吗？此操作不可恢复。','Delete this picture? This cannot be undone.'), danger:true }); if(!ok) return;
        allHistory = allHistory.filter(h=>h.id!==entry.id); shared.history=allHistory; if (activeEntry?.id===entry.id) { activeEntry=allHistory[0]??null; if (activeEntry) void showDetail(activeEntry); else { previewWrap.style.display='none'; empty.style.display=''; renderMeta(null); buildOps(null); } } renderGallery(); ctx.ui.toast(t('已从画廊移除，文件仍保留在输出目录','Removed from gallery; file kept'));
      });

      opsPanel.append(redraw, tweak, useAll, copySeed, toPet, compare, openFolder, fav, del);
    };

    const enterCompare = (a: HistoryEntry): void => {
      compareA = a; compareMode = true; compareBar.style.display='flex'; compareTip.textContent = t('已选 1 张，请在左侧画廊再选 1 张进行对比','Selected 1, pick another in gallery to compare');
      // 高亮提示：画廊可点击
      ctx.ui.toast(t('请在左侧画廊再选 1 张','Pick another in gallery'));
    };
    const exitCompare = (): void => { compareMode=false; compareA=null; compareB=null; compareBar.style.display='none'; renderMeta(activeEntry); buildOps(activeEntry); if (activeEntry) void showDetail(activeEntry); };
    cancelCompare.addEventListener('click', exitCompare);
    const showCompare = async (a: HistoryEntry, b: HistoryEntry): Promise<void> => {
      compareB = b;
      // 右栏切换为对比视图
      previewWrap.style.display='none'; empty.style.display='none';
      metaGrid.replaceChildren();
      const wrap = ctx.ui.h('div','coo-compare-view');
      const paneA = ctx.ui.h('div','pane'); const paneB = ctx.ui.h('div','pane');
      const imgA = document.createElement('img'); imgA.style.width='100%'; imgA.style.borderRadius='8px'; imgA.style.border='1px solid var(--line, rgba(127,127,127,.18))';
      const imgB = document.createElement('img'); imgB.style.width='100%'; imgB.style.borderRadius='8px'; imgB.style.border='1px solid var(--line, rgba(127,127,127,.18))';
      const infoA = ctx.ui.h('div','', `${t('种子','Seed')} ${a.seed} · ${a.width}×${a.height} · ${shortDate(a.created_at)}`); infoA.style.fontSize='12px'; infoA.style.color='#8a8f98'; infoA.style.marginTop='6px';
      const promptA = ctx.ui.h('div','', a.positive.slice(0,120)+(a.positive.length>120?'…':'')); promptA.style.fontSize='12px'; promptA.style.lineHeight='1.5';
      const infoB = ctx.ui.h('div','', `${t('种子','Seed')} ${b.seed} · ${b.width}×${b.height} · ${shortDate(b.created_at)}`); infoB.style.fontSize='12px'; infoB.style.color='#8a8f98'; infoB.style.marginTop='6px';
      const promptB = ctx.ui.h('div','', b.positive.slice(0,120)+(b.positive.length>120?'…':'')); promptB.style.fontSize='12px'; promptB.style.lineHeight='1.5';
      paneA.append(imgA, infoA, promptA); paneB.append(imgB, infoB, promptB); wrap.append(paneA, paneB);
      const closeBtn = ctx.ui.button(t('关闭对比','Close'), { size:'sm' }); closeBtn.addEventListener('click', exitCompare);
      closeBtn.classList.add('btn-action', 'default');
      metaGrid.append(wrap, closeBtn);
      opsPanel.replaceChildren(closeBtn);
      // 加载图片
      try { const blob=await ctx.invokeBinary('image', [a.id]); const url=URL.createObjectURL(blob); imageUrls.push(url); imgA.src=url; } catch {}
      try { const blob=await ctx.invokeBinary('image', [b.id]); const url=URL.createObjectURL(blob); imageUrls.push(url); imgB.src=url; } catch {}
    };

    const showDetail = async (entry: HistoryEntry): Promise<void> => {
      activeEntry = entry;
      markViewed(entry.id);
      if (compareMode && compareA && entry.id!==compareA.id) { await showCompare(compareA, entry); for (const el of Array.from(grid.querySelectorAll('.coo-works-tile'))) { (el as HTMLElement).classList.toggle('sel', (el as HTMLElement).dataset.id===entry.id || (el as HTMLElement).dataset.id===compareA.id); } return; }
      // 切换预览：旧图保留，新图加载后150ms淡入
      previewWrap.style.display='block'; empty.style.display='none';
      previewWrap.classList.add('is-loading');
      try {
        const blob = await ctx.invokeBinary('image', [entry.id]);
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        const oldUrl = activePreviewUrl;
        activePreviewUrl = url;
        // 预加载
        previewNext.src = url; previewNext.style.display='block'; previewNext.style.opacity='0';
        await new Promise<void>((res, rej)=>{ previewNext.onload=()=>res(); previewNext.onerror=()=>rej(new Error('load failed')); setTimeout(()=>res(), 2000); });
        if (!alive) return;
        preview.src = url;
        previewNext.style.display='none';
        preview.style.opacity='1';
        previewWrap.classList.remove('is-loading');
        if (oldUrl) setTimeout(()=> URL.revokeObjectURL(oldUrl), 500);
      } catch(e){
        previewWrap.classList.remove('is-loading');
        const failed = ctx.ui.h('div','', t('图片加载失败','Image load failed')); failed.style.padding='12px'; failed.style.textAlign='center';
        const retry = ctx.ui.button(t('重试','Retry'), { size:'sm' }); retry.addEventListener('click', ()=> void showDetail(entry));
        failed.append(retry); empty.replaceChildren(failed); empty.style.display=''; previewWrap.style.display='none';
      }
      renderMeta(entry); buildOps(entry);
      for (const el of Array.from(grid.querySelectorAll('.coo-works-tile'))) { (el as HTMLElement).classList.toggle('sel', (el as HTMLElement).dataset.id===entry.id); }
    };

    const filtered = (): HistoryEntry[] => {
      const q = searchInput.value.trim().toLowerCase();
      const range = datePicker.getRange();
      const fromDay = range.from ? parseDate(range.from) : null;
      const toDay = range.to ? parseDate(range.to) : null;
      const from = fromDay ? dayStartValue(fromDay) : 0;
      const to = toDay ? dayEndExclusiveValue(toDay) : Infinity;
      const model = modelDD.getValue();
      let list = allHistory.filter(h=>{
        if (q && !(`${h.positive} ${h.negative} ${String(h.seed)} ${h.filename}`.toLowerCase().includes(q))) return false;
        if (h.created_at < from || h.created_at > to) return false;
        if (model && h.checkpoint !== model) return false;
        if (loraFilterSelected.size) { const has = h.loras.some(l=> loraFilterSelected.has(l.path)); if (!has) return false; }
        return true;
      });
      // 排序 - 元素 + 方向组合
      const elem = sortElement.getValue();
      const dir = sortDir.getValue();
      const mul = dir==='asc' ? 1 : -1;
      if (elem==='time') list = [...list].sort((a,b)=> (a.created_at - b.created_at)*mul);
      else if (elem==='size') list = [...list].sort((a,b)=> ((a.width*a.height) - (b.width*b.height))*mul);
      else if (elem==='filename') list = [...list].sort((a,b)=> a.filename.localeCompare(b.filename)*mul);
      else list = [...list].sort((a,b)=> (a.created_at - b.created_at)*mul);
      // 默认时间倒序（最新在前）已在 desc 时实现
      return list;
    };

    const clearFilters = (): void => {
      searchInput.value = '';
      datePicker.clear();
      modelDD.setValue('');
      sortElement.setValue('time');
      sortDir.setValue('desc');
      loraFilterSelected.clear();
      updateLoraBtn();
      closeLora();
      renderGallery();
    };

    const renderGallery = (): void => {
      const list = filtered();
      const total = allHistory.length;
      // 差量更新：若ID完全一致则不重排DOM（避免闪烁）
      const curIds = list.map(e=>e.id).join(',');
      const prevIds = (grid as any)._prevIds as string | undefined;
      if (prevIds === curIds && total) {
        // 仅更新选中态
        for (const el of Array.from(grid.querySelectorAll('.coo-works-tile'))) {
          const id = (el as HTMLElement).dataset.id!;
          (el as HTMLElement).classList.toggle('sel', id===activeEntry?.id || id===compareA?.id || id===compareB?.id);
        }
        return;
      }
      (grid as any)._prevIds = curIds;
      // 统计行
      if (!total) {
        statsText.textContent = t('共 0 张','0 pictures');
      } else if (list.length===total) {
        statsText.textContent = t(`共 ${total} 张`, `${total} pictures`);
      } else {
        statsText.textContent = t(`共 ${total} 张 | 筛选出 ${list.length} 张 / 共 ${total} 张`, `${total} | ${list.length} / ${total} pictures`);
      }
      // 清除筛选按钮显隐
      const currentRange = datePicker.getRange();
      const hasFilter = !!searchInput.value.trim() || !!currentRange.from || !!currentRange.to || !!modelDD.getValue() || loraFilterSelected.size>0;
      clearBtn.style.display = hasFilter ? '' : 'none';

      grid.replaceChildren();
      // 空状态
      if (!total) {
        emptyState.style.display='flex'; grid.style.display='none'; loadMoreBtn.style.display='none';
        emptyTitle.textContent = t('还没有作品','No works yet');
        emptySub.textContent = t('去「出图」页画一张吧','Go to Studio and create one');
        emptyAction.replaceChildren();
        const go = ctx.ui.button(t('前往出图','Go to Studio'), { variant:'primary' });
        go.classList.add('btn-action', 'primary');
        go.addEventListener('click', ()=>{ ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab',{ detail:'studio', bubbles:true })); const m=ctx as unknown as {switchTab?:(v:string)=>void}; if(m.switchTab) m.switchTab('studio'); });
        emptyAction.append(go);
        dispatchUnread(); return;
      }
      if (!list.length) {
        emptyState.style.display='flex'; grid.style.display='none'; loadMoreBtn.style.display='none';
        emptyTitle.textContent = t('没有匹配的作品','No matches');
        emptySub.textContent = t('试试调整筛选条件','Try adjusting filters');
        emptyAction.replaceChildren();
        const c = ctx.ui.button(t('清除筛选','Clear'), { size:'sm' }); c.addEventListener('click', clearFilters);
        emptyAction.append(c);
        dispatchUnread(); return;
      }
      emptyState.style.display='none'; grid.style.display='grid';
      loadMoreBtn.style.display = allHistory.length < pageLimit ? 'none' : '';

      const visible = list.slice(0, loadMoreBtn.style.display==='' ? pageLimit : 2000);
      for (const entry of visible) {
        const tile = ctx.ui.h('button', 'coo-works-tile'); tile.type='button'; (tile as HTMLElement).dataset.id = entry.id;
        if (activeEntry?.id===entry.id || (compareA && compareA.id===entry.id) || (compareB && compareB.id===entry.id)) tile.classList.add('sel');
        const img = ctx.ui.h('img',''); img.alt = entry.filename; img.loading='lazy'; (img as any).dataset.id = entry.id;
        // 使用稳定 key：dataset.id，已缓存则复用，不触发请求
        const cached = thumbCache.get(entry.id);
        if (cached) { img.src = cached; } else { img.dataset.needLoad='1'; }
        const label = ctx.ui.h('span','lab', `${entry.width}×${entry.height}`);
        tile.title = `${entry.filename}\n${t('种子','Seed')}: ${entry.seed}\n${t('尺寸','Size')}: ${entry.width}×${entry.height}\n${t('时间','Time')}: ${shortDate(entry.created_at)}`;
        if (batchMode) {
          const chk = document.createElement('input'); chk.type='checkbox'; chk.className='chk'; chk.checked = selected.has(entry.id);
          chk.addEventListener('click', (e)=>{ e.stopPropagation(); if (chk.checked) selected.add(entry.id); else selected.delete(entry.id); batchCount.textContent = selected.size ? t(`已选 ${selected.size} 张`, `${selected.size} selected`) : t('已选 0 张','0 selected'); });
          tile.append(chk);
        }
        // 红点：未查看且不在已查看集合
        if (!viewed.has(entry.id)) {
          const dot = ctx.ui.h('span','coo-works-dot'); tile.append(dot);
        }
        tile.append(img, label);
        tile.addEventListener('click', ()=>{
          if (batchMode) { if (selected.has(entry.id)) selected.delete(entry.id); else selected.add(entry.id); batchCount.textContent = selected.size ? t(`已选 ${selected.size} 张`, `${selected.size} selected`) : t('已选 0 张','0 selected'); renderGallery(); return; }
          // 点击只更新选中ID，不触发列表请求（满足 1.1）
          void showDetail(entry);
        });
        grid.append(tile);
        if (!cached) {
          void ctx.invokeBinary('image', [entry.id]).then(blob=>{ if (!alive) return; const url=URL.createObjectURL(blob); thumbCache.set(entry.id, url); img.src=url; img.removeAttribute('data-needLoad'); }).catch(()=>{ img.alt='×'; });
        }
      }
      dispatchUnread();
    };

    // 筛选事件（下拉/日期控件内部已各自派发 change）
    searchInput.addEventListener('input', renderGallery);
    clearBtn.addEventListener('click', clearFilters);

    loadMoreBtn.addEventListener('click', async ()=>{
      pageLimit += 50;
      await fetchHistory(pageLimit);
      loadMoreBtn.style.display = allHistory.length >= pageLimit ? '' : 'none';
      ctx.ui.toast(t(`已加载至 ${allHistory.length} 张`,`Loaded ${allHistory.length}`));
    });

    // 批量模式：切换 .is-active（靛紫描边/淡紫底由主题变量控制），并关闭所有弹层
    batchToggle.addEventListener('click', ()=>{
      batchMode=!batchMode;
      closeAllPopovers();
      batchToggle.classList.toggle('is-active', batchMode);
      batchToggleIcon.innerHTML = batchMode ? '<path d="M20 6L9 17l-5-5"/>' : '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>';
      batchToggleLabel.textContent = batchMode ? t('退出批量模式','Exit batch') : t('批量模式','Batch');
      batchToggle.setAttribute('aria-pressed', String(batchMode));
      if (batchMode) {
        batchBar.style.display='flex'; previewWrap.style.display='none'; metaCard.style.display='none'; opsCard.style.display='none';
        batchCount.textContent = t('已选 0 张','0 selected');
      } else {
        batchBar.style.display='none'; metaCard.style.display=''; opsCard.style.display='';
        selected.clear();
        if (activeEntry) { previewWrap.style.display='block'; void showDetail(activeEntry); } else { previewWrap.style.display='none'; empty.style.display=''; }
      }
      renderGallery();
    });
    batchAll.addEventListener('click', ()=>{ const list = filtered(); for (const h of list) selected.add(h.id); batchCount.textContent = t(`已选 ${selected.size} 张`, `${selected.size} selected`); renderGallery(); });
    batchInverse.addEventListener('click', ()=>{ const list = filtered(); for (const h of list) { if (selected.has(h.id)) selected.delete(h.id); else selected.add(h.id); } batchCount.textContent = t(`已选 ${selected.size} 张`, `${selected.size} selected`); renderGallery(); });
    batchDel.addEventListener('click', async ()=>{
      if (!selected.size) return; const ok = await ctx.ui.confirm({ title: t('批量删除？', 'Delete selected?'), body: t(`确定删除 ${selected.size} 张？此操作不可恢复。`, `Delete ${selected.size} pictures? This cannot be undone.`), danger: true }); if (!ok) return;
      allHistory = allHistory.filter(h=> !selected.has(h.id)); shared.history = allHistory;
      // 清理选中
      for (const id of [...selected]) viewed.delete(id);
      saveViewed(viewed);
      selected.clear(); batchCount.textContent=t('已选 0 张','0 selected'); renderGallery();
      if (activeEntry && !allHistory.some(h=>h.id===activeEntry!.id)) { activeEntry=allHistory[0]??null; if(activeEntry) void showDetail(activeEntry); else { previewWrap.style.display='none'; empty.style.display=''; renderMeta(null); buildOps(null); } }
      ctx.ui.toast(t('已删除','Deleted'));
    });
    batchExport.addEventListener('click', ()=>{ ctx.ui.toast(t('已请求打开文件夹，请手动复制','Open folder to copy')); void ctx.invoke('openFolder'); });

    // 自动选中
    renderGallery();
    if (activeEntry) void showDetail(activeEntry);
    else if (allHistory[0]) void showDetail(allHistory[0]);

    // 轮询新图
    ctx.interval(async ()=>{
      if (!alive) return;
      try { const res = await ctx.invoke<HistoryResponse>('history', [pageLimit]); if (!alive) return; if (res.history.length !== allHistory.length || res.history[0]?.id !== allHistory[0]?.id) { allHistory = res.history; shared.history = allHistory; refreshModelOptions(); refreshLoraFilterOptions(); renderGallery(); } } catch {}
    }, 2000);
  },
};


/* ------------------------------------------------------------------ loras */

const lorasPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });

    let boot: CooGenBootstrap;
    try {
      boot = await ctx.invoke<CooGenBootstrap>('bootstrap');
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t('LoRA 管理', 'LoRA manager') });
      sheet.body.append(ctx.ui.msgline(errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;

    let loras = boot.loras;
    let defaults = [...boot.defaults];
    let aliases = { ...boot.aliases };
    let loraRoot = boot.lora_root ?? '';
    let category = '';

    const head = ctx.ui.sheet({
      title: t('LoRA 管理', 'LoRA manager'),
      desc: t('扫描 ComfyUI 的 models/loras；设常驻组合、中文别名和触发词。支持设置别名分类备注，出图页优先显示别名。',
        'Scans ComfyUI models/loras; set always-on defaults, aliases and trigger words. Aliases are shown first in Studio.'),
    });
    ctx.root.append(head.el);

    const statusLine = ctx.ui.msgline('');
    const search = ctx.ui.input({ type: 'search', placeholder: t('搜索名称/路径/别名/触发词', 'Search name/path/alias/trigger') });
    search.style.flex = '1';
    search.style.minWidth = '200px';
    const categorySelect = ctx.ui.select({ options: [t('全部分类', 'All categories')] });
    const rescan = ctx.ui.button(t('重新扫描', 'Rescan'), { size: 'sm' });
    const filterRow = ctx.ui.rowbar();
    filterRow.append(search, categorySelect, rescan);
    head.body.append(statusLine, filterRow);

    const renderStatus = (): void => {
      statusLine.textContent = t(
        `共 ${loras.length} 个 LoRA；常驻 ${defaults.length} 个${loraRoot ? ` · 目录 ${loraRoot}` : ' · 没有设置 ComfyUI 根目录，预览图/分类可能缺失'}`,
        `${loras.length} LoRAs; ${defaults.length} always-on${loraRoot ? ` · ${loraRoot}` : ' · no ComfyUI root set, previews/categories may be missing'}`,
      );
      statusLine.classList.toggle('bad', !loraRoot);
    };
    renderStatus();

    const categories = [...new Set(loras.map((item) => item.category).filter(Boolean))].sort();
    categorySelect.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = t('全部分类', 'All categories');
    categorySelect.append(allOption);
    for (const item of categories) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      categorySelect.append(option);
    }

    const table = ctx.ui.table({
      head: ['', t('LoRA', 'LoRA'), t('别名 / 触发词', 'Aliases / triggers'), t('操作', 'Actions')],
      maxHeight: 'calc(100vh - 330px)',
    });
    head.body.append(table.el);

    const loraUrls: string[] = [];
    ctx.own({ dispose: () => { for (const url of loraUrls) URL.revokeObjectURL(url); } });
    const loadLoraThumb = (thumb: HTMLImageElement): void => {
      if (!alive || thumb.dataset.loaded === '1' || !thumb.dataset.path) return;
      thumb.dataset.loaded = '1';
      void ctx.invokeBinary('loraPreview', [thumb.dataset.path]).then((blob) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        loraUrls.push(url);
        thumb.src = url;
      }).catch(() => {
        thumb.alt = '×';
      });
    };
    const loraObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const thumb = entry.target as HTMLImageElement;
          loraObserver?.unobserve(thumb);
          loadLoraThumb(thumb);
        }
      }, { rootMargin: '160px' })
      : null;
    if (loraObserver) ctx.own({ dispose: () => loraObserver.disconnect() });

    const render = (): void => {
      const query = search.value.trim().toLowerCase();
      const filtered = loras.filter((item) => {
        if (category && item.category !== category) return false;
        if (!query) return true;
        return [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words]
          .some((value) => value.toLowerCase().includes(query));
      });
      loraObserver?.disconnect();
      table.clear(filtered.length ? undefined : t('没有匹配的 LoRA', 'No matching LoRA'));
      for (const [index, record] of filtered.slice(0, 500).entries()) {
        const isDefault = defaults.some((item) => item.path === record.path);
        const thumb = ctx.ui.h('img', 'coo-gen-lora-thumb');
        thumb.alt = '';
        if (record.preview) {
          thumb.dataset.path = record.path;
          thumb.loading = 'lazy';
          if (loraObserver) loraObserver.observe(thumb);
          else if (index < 40) loadLoraThumb(thumb);
          thumb.addEventListener('click', () => {
            void (async () => {
              try {
                const url = await ctx.invokeBinary('loraPreview', [record.path]).then((blob) => objectUrl(ctx, blob));
                if (alive) ctx.ui.lightbox(url, record.name);
              } catch (error) {
                ctx.ui.toast(errText(error), 'bad');
              }
            })();
          });
        }
        const name = document.createElement('div');
        const nameText = document.createElement('div');
        nameText.textContent = stripExt(record.name);
        nameText.title = record.path;
        const pathText = document.createElement('div');
        pathText.className = 'coo-gen-sub';
        pathText.textContent = `${record.path}${record.category ? ` · ${record.category}` : ''}`;
        pathText.title = record.path;
        name.append(nameText, pathText);
        if (isDefault) name.append(pill(ctx, t('常驻', 'always-on'), 'on'));

        const meta = document.createElement('div');
        const aliasText = document.createElement('div');
        aliasText.textContent = record.aliases.length ? record.aliases.join(' / ') : t('（无别名）', '(no alias)');
        const trigText = document.createElement('div');
        trigText.className = 'coo-gen-sub';
        trigText.textContent = record.trigger_words.length ? record.trigger_words.slice(0, 6).join(' / ') : t('（无触发词）', '(no triggers)');
        meta.append(aliasText, trigText);

        const actions = ctx.ui.rowbar();
        const defaultBtn = ctx.ui.button(isDefault ? t('取消常驻', 'Remove default') : t('设为常驻', 'Make default'), {
          size: 'sm',
          variant: isDefault ? 'plain' : 'primary',
        });
        defaultBtn.addEventListener('click', () => {
          if (isDefault) defaults = defaults.filter((item) => item.path !== record.path);
          else defaults = [...defaults, { name: record.name, path: record.path, weight: record.weight ?? 0.75, trigger_words: record.trigger_words }];
          void saveDefaults();
        });
        const aliasBtn = ctx.ui.button(t('别名', 'Aliases'), { size: 'sm' });
        aliasBtn.addEventListener('click', () => openMeta(record, 'aliases'));
        const trigBtn = ctx.ui.button(t('触发词', 'Triggers'), { size: 'sm' });
        trigBtn.addEventListener('click', () => openMeta(record, 'trigger_words'));
        actions.append(defaultBtn, aliasBtn, trigBtn);
        table.addRow([thumb, name, meta, actions]);
      }
    };

    const openMeta = (record: LoRARecord, key: 'aliases' | 'trigger_words'): void => {
      const body = document.createElement('div');
      const line = ctx.ui.msgline(t(
        key === 'aliases' ? '别名用逗号分隔；对话里命中别名就会匹配到这个 LoRA。' : '触发词用逗号分隔；用户话里出现就会匹配。',
        key === 'aliases' ? 'Separate aliases with commas; a match in chat selects this LoRA.' : 'Separate trigger words with commas; a mention selects this LoRA.',
      ));
      const input = ctx.ui.input({ value: record[key].join(', '), cls: 'mono' });
      input.style.width = '100%';
      const save = ctx.ui.button(t('保存', 'Save'), { variant: 'primary' });
      body.append(line, input, save);
      const drawer = ctx.ui.drawer(`${record.name} · ${key === 'aliases' ? t('别名', 'Aliases') : t('触发词', 'Triggers')}`, body);
      save.addEventListener('click', () => {
        void (async () => {
          try {
            await ctx.invoke('setLoraMeta', [record.path, { [key]: splitList(input.value) }]);
            const res = await ctx.invoke<LoraListResponse>('listLoras');
            if (!alive) return;
            loras = res.loras;
            defaults = res.defaults;
            aliases = res.aliases;
            loraRoot = res.lora_root ?? loraRoot;
            render();
            renderAliases();
            drawer.dispose();
            ctx.ui.toast(t('已保存', 'Saved'));
          } catch (error) {
            line.textContent = errText(error);
            line.classList.add('bad');
          }
        })();
      });
    };

    const saveDefaults = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<{ ok: boolean; defaults?: DefaultLoRA[]; error?: string }>('setDefaults', [defaults]);
        if (!res.ok) throw new Error(res.error ?? '保存失败');
        defaults = res.defaults ?? defaults;
        render();
        renderDefaults();
        renderStatus();
        ctx.ui.toast(t('常驻 LoRA 已保存', 'Always-on LoRAs saved'));
      } catch (error) {
        ctx.ui.toast(errText(error), 'bad');
      }
    };

    search.addEventListener('input', render, { signal: ctx.signal });
    categorySelect.addEventListener('change', () => { category = categorySelect.value; render(); });
    rescan.addEventListener('click', () => {
      void (async () => {
        try {
          const res = await ctx.invoke<{
            loras: LoRARecord[]; checkpoints: string[]; samplers: string[]; schedulers: string[];
            control_nets: string[]; lora_root: string; health: CooGenBootstrap['health'];
          }>('refreshModels');
          if (!alive) return;
          loras = res.loras;
          loraRoot = res.lora_root ?? loraRoot;
          render();
          renderStatus();
          ctx.ui.toast(t(`扫到 ${loras.length} 个 LoRA`, `${loras.length} LoRAs`));
        } catch (error) {
          ctx.ui.toast(errText(error), 'bad');
        }
      })();
    });

    const defaultSheet = ctx.ui.sheet({
      title: t('常驻组合', 'Always-on stack'),
      desc: t('每次出图都会自动叠加；对话匹配优先，超上限时淘汰常驻。可拖拽排序，顺序影响叠加效果。', 'Applied to every generation; chat matches win when cap hit. Drag to reorder.'),
    });
    ctx.root.append(defaultSheet.el);
    const defaultsTable = ctx.ui.table({ head: [t('LoRA', 'LoRA'), t('权重', 'Weight'), ''] });
    defaultSheet.body.append(defaultsTable.el);

    const renderDefaults = (): void => {
      defaultsTable.clear(defaults.length ? undefined : t('还没有常驻 LoRA。', 'No always-on LoRA yet.'));
      for (const [index, item] of defaults.entries()) {
        const name = document.createElement('div');
        name.textContent = stripExt(item.name);
        const sub = document.createElement('div');
        sub.className = 'coo-gen-sub';
        sub.textContent = item.path;
        name.append(sub);
        const weight = ctx.ui.input({ type: 'number', value: String(item.weight), cls: 'mono coo-gen-weight' });
        weight.min = '0.05';
        weight.max = '2';
        weight.step = '0.05';
        weight.addEventListener('change', () => {
          defaults[index] = { ...item, weight: Math.min(2, Math.max(0.05, num(weight.value, item.weight))) };
        });
        const remove = ctx.ui.button(t('移除', 'Remove'), { size: 'sm', variant: 'plain' });
        remove.addEventListener('click', () => {
          defaults.splice(index, 1);
          void saveDefaults();
        });
        // 拖拽排序简易实现：上下按钮
        const up = ctx.ui.button('↑', { size: 'sm' }); up.disabled = index===0;
        up.addEventListener('click', ()=>{ if(index>0){ const tmp=defaults[index-1]!; defaults[index-1]=defaults[index]!; defaults[index]=tmp; void saveDefaults(); }});
        const down = ctx.ui.button('↓', { size: 'sm' }); down.disabled = index===defaults.length-1;
        down.addEventListener('click', ()=>{ if(index<defaults.length-1){ const tmp=defaults[index+1]!; defaults[index+1]=defaults[index]!; defaults[index]=tmp; void saveDefaults(); }});
        const rowActions = ctx.ui.rowbar(); rowActions.append(up, down, remove);
        defaultsTable.addRow([name, weight, rowActions]);
      }
    };
    renderDefaults();

    const aliasSheet = ctx.ui.sheet({
      title: t('别名表', 'Alias table'),
      desc: t('“塞尔达” → zelda_botw_style；对话里出现中文别名就会匹配。支持分类与备注。', '“Zelda” → zelda_botw_style; a mention selects the LoRA.'),
    });
    ctx.root.append(aliasSheet.el);
    const aliasTable = ctx.ui.table({ head: [t('别名', 'Alias'), t('LoRA（逗号分隔）', 'LoRAs (comma separated)'), ''] });
    aliasSheet.body.append(aliasTable.el);
    const addRow = ctx.ui.rowbar();
    const newAlias = ctx.ui.input({ placeholder: t('新别名，例如 塞尔达', 'New alias, e.g. Zelda') });
    const newTargets = ctx.ui.input({ placeholder: t('目标，例如 zelda_botw_style, zelda_totk', 'Targets, e.g. zelda_botw_style, zelda_totk') });
    const addAlias = ctx.ui.button(t('添加', 'Add'), { size: 'sm' });
    addRow.append(newAlias, newTargets, addAlias);
    aliasSheet.body.append(addRow);

    const saveAliases = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<{ ok: boolean; aliases?: Record<string, string[]>; error?: string }>('setAliases', [aliases]);
        if (!res.ok) throw new Error(res.error ?? '保存失败');
        aliases = res.aliases ?? aliases;
        renderAliases();
        render();
        ctx.ui.toast(t('别名表已保存', 'Alias table saved'));
      } catch (error) {
        ctx.ui.toast(errText(error), 'bad');
      }
    };

    const renderAliases = (): void => {
      aliasTable.clear(Object.keys(aliases).length ? undefined : t('还没有别名。', 'No aliases yet.'));
      for (const [alias, targets] of Object.entries(aliases)) {
        const remove = ctx.ui.button(t('删除', 'Delete'), { size: 'sm', variant: 'plain' });
        remove.addEventListener('click', () => {
          delete aliases[alias];
          void saveAliases();
        });
        aliasTable.addRow([alias, targets.join(', '), remove]);
      }
    };
    addAlias.addEventListener('click', () => {
      const alias = newAlias.value.trim();
      const targets = splitList(newTargets.value);
      if (!alias || !targets.length) {
        ctx.ui.toast(t('别名和目标都要填', 'Both alias and targets are required'), 'bad');
        return;
      }
      aliases[alias] = targets;
      newAlias.value = '';
      newTargets.value = '';
      void saveAliases();
    });
    renderAliases();
    render();

    void ctx.invoke<{ loras: LoRARecord[] }>('listLoras').then(() => { if (alive) renderStatus(); }).catch(() => {});
  },
};

/* -------------------------------------------------------------- workflows */

const workflowsPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });

    let presets: WorkflowSummary[] = [];
    let defaultWorkflow = '';
    try {
      const boot = await ctx.invoke<{ presets: WorkflowSummary[]; default_workflow?: string }>('presets');
      presets = boot.presets;
      defaultWorkflow = boot.default_workflow ?? '';
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t('工作流', 'Workflows') });
      sheet.body.append(ctx.ui.msgline(errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;

    const listSheet = ctx.ui.sheet({
      title: t('工作流', 'Workflows'),
      desc: t('内置文生图 / 图生图 / ControlNet；也可以导入 ComfyUI 导出的 JSON。', 'Built-in txt2img / img2img / ControlNet; import a ComfyUI JSON too.'),
    });
    ctx.root.append(listSheet.el);
    const table = ctx.ui.table({ head: [t('名称', 'Name'), t('类型', 'Kind'), t('参数', 'Params'), t('操作', 'Actions')] });
    listSheet.body.append(table.el);
    const line = ctx.ui.msgline('');
    listSheet.body.append(line);

    const render = (): void => {
      table.clear(presets.length ? undefined : t('还没有工作流', 'No workflows'));
      for (const preset of presets) {
        const name = document.createElement('div');
        name.textContent = preset.name;
        const sub = document.createElement('div');
        sub.className = 'coo-gen-sub';
        sub.textContent = preset.id + (preset.source ? ` · ${preset.source}` : '');
        name.append(sub);
        const kind = document.createElement('div');
        kind.textContent = preset.kind ?? (preset.builtin ? 'builtin' : 'imported');
        if (preset.warnings?.length) {
          kind.append(pill(ctx, t('有提醒', 'warning'), 'off'));
          kind.title = preset.warnings.join('\n');
        }
        const params = document.createElement('div');
        params.textContent = String(preset.mapping_count);
        const actions = ctx.ui.rowbar();
        if (preset.id === defaultWorkflow) {
          const isDefault = ctx.ui.button(t('默认', 'Default'), { size: 'sm', variant: 'primary' });
          isDefault.classList.add('coo-gen-default-btn');
          isDefault.setAttribute('aria-current', 'true');
          isDefault.title = t('当前默认工作流', 'Current default workflow');
          isDefault.addEventListener('click', () => {
            ctx.ui.toast(t('这已经是默认工作流', 'This is already the default workflow'));
          });
          actions.append(isDefault);
        } else {
          const use = ctx.ui.button(t('设为默认', 'Use as default'), { size: 'sm' });
          use.addEventListener('click', () => {
            void (async () => {
              try {
                await ctx.setConfig('world:draw-local', { 'worlds.draw.localDefaultWorkflow': preset.id });
                defaultWorkflow = preset.id;
                render();
                ctx.ui.toast(t('已设为默认工作流', 'Default workflow saved'));
              } catch (error) {
                ctx.ui.toast(errText(error), 'bad');
              }
            })();
          });
          actions.append(use);
        }
        const detail = ctx.ui.button(t('详情', 'Details'), { size: 'sm' });
        detail.addEventListener('click', () => {
          void (async () => {
            try {
              const res = await ctx.invoke<PresetDetail>('presetDetail', [preset.id]);
              if (!res.ok || !res.preset) throw new Error(res.error ?? '读取失败');
              const body = document.createElement('div');
              const mapping = ctx.ui.table({ head: ['param', 'node', 'field', 'type'] });
              for (const item of res.preset.mapping) {
                mapping.addRow([item.param, item.node_id, item.field, item.ui_type]);
              }
              body.append(mapping.el);
              if (res.preset.warnings.length) body.append(ctx.ui.msgline(res.preset.warnings.join('；'), true));
              ctx.ui.drawer(res.preset.name, body);
            } catch (error) {
              ctx.ui.toast(errText(error), 'bad');
            }
          })();
        });
        actions.append(detail);
        if (!preset.builtin) {
          const remove = ctx.ui.button(t('删除', 'Delete'), { size: 'sm', variant: 'danger' });
          remove.addEventListener('click', () => {
            void (async () => {
              const ok = await ctx.ui.confirm({ title: t('删除工作流？', 'Delete workflow?'), body: preset.name, danger: true });
              if (!ok) return;
              try {
                await ctx.invoke('removePreset', [preset.id]);
                presets = presets.filter((item) => item.id !== preset.id);
                render();
                ctx.ui.toast(t('已删除', 'Deleted'));
              } catch (error) {
                ctx.ui.toast(errText(error), 'bad');
              }
            })();
          });
          actions.append(remove);
        }
        table.addRow([name, kind, params, actions]);
      }
    };
    render();

    const importSheet = ctx.ui.sheet({
      title: t('导入工作流', 'Import workflow'),
      desc: t('支持 ComfyUI 的 API 格式，也会把 UI 格式按 /object_info 自动转换；参数会自动识别。', 'Accepts API format; UI format is converted with /object_info. Parameters are auto-detected.'),
    });
    ctx.root.append(importSheet.el);
    const pathRow = ctx.ui.rowbar();
    const pathInput = ctx.ui.input({ cls: 'mono', placeholder: t('ComfyUI 导出的 .json 绝对路径', 'Absolute path to the exported .json') });
    pathInput.style.flex = '1';
    pathInput.style.minWidth = '240px';
    const pick = ctx.ui.button(t('选择…', 'Choose…'), { size: 'sm' });
    pick.addEventListener('click', () => {
      void (async () => {
        try {
          const picked = await ctx.pickPath({ kind: 'file', extensions: ['json'] });
          if (picked) pathInput.value = picked;
        } catch (error) {
          line.textContent = errText(error);
          line.classList.add('bad');
        }
      })();
    });
    const nameInput = ctx.ui.input({ placeholder: t('名称（留空用文件名）', 'Name (defaults to file name)') });
    nameInput.style.width = '100%';
    const importBtn = ctx.ui.button(t('导入', 'Import'), { variant: 'primary', size: 'sm' });
    pathRow.append(pathInput, pick, importBtn);
    importSheet.body.append(pathRow, ctx.ui.field(t('名称', 'Name'), nameInput));

    importBtn.addEventListener('click', () => {
      const path = pathInput.value.trim();
      if (!path) {
        line.textContent = t('先填 JSON 路径。', 'Enter the JSON path first.');
        line.classList.add('bad');
        return;
      }
      void (async () => {
        importBtn.disabled = true;
        line.classList.remove('bad');
        line.textContent = t('正在导入…', 'Importing…');
        try {
          const res = await ctx.invoke<{ ok: boolean; preset?: WorkflowSummary; warnings?: string[]; error?: string }>('importWorkflow', [path, nameInput.value.trim()]);
          if (!alive) return;
          if (!res.ok || !res.preset) throw new Error(res.error ?? '导入失败');
          presets = [res.preset, ...presets];
          render();
          line.textContent = t(
            `已导入「${res.preset.name}」，识别到 ${res.preset.mapping_count} 个参数${res.warnings?.length ? `；${res.warnings.join('；')}` : ''}`,
            `Imported “${res.preset.name}” with ${res.preset.mapping_count} parameters${res.warnings?.length ? `; ${res.warnings.join('; ')}` : ''}`,
          );
          line.classList.toggle('bad', Boolean(res.warnings?.length));
          ctx.ui.toast(t('工作流已导入', 'Workflow imported'));
        } catch (error) {
          line.textContent = errText(error);
          line.classList.add('bad');
        } finally {
          importBtn.disabled = false;
        }
      })();
    });
  },
};

export { studioPanel, lorasPanel, workflowsPanel, worksPanel };
