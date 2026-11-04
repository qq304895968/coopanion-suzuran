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
    const workflowSelect = ctx.ui.select({
      options: presets.map((item) => ({
        value: item.id,
        label: `${item.name}${item.builtin ? '' : t('（导入）', ' (imported)')}`,
      })),
    });
    workflowSelect.value = state.workflow;
    workflowRow.append(ctx.ui.field(t('工作流', 'Workflow'), workflowSelect));
    const workflowHint = ctx.ui.msgline('');
    // 参数映射 ℹ️ 图标
    const infoBtn = document.createElement('button');
    infoBtn.className='coo-info-btn';
    infoBtn.title = t('查看参数映射', 'View param mapping');
    infoBtn.append(svgIcon('info', 16));
    infoBtn.style.display='inline-flex'; infoBtn.style.alignItems='center'; infoBtn.style.justifyContent='center';
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
    paramSheet.body.append(workflowRow, workflowHint);

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
    const loraTable: WebUiTable = ctx.ui.table({ head: ['', t('LoRA', 'LoRA'), t('权重', 'Weight')], maxHeight: '400px' });
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
        // 隐藏扩展名，hover 显示完整路径
        sub.textContent = [record.path, record.category || t('未分类', 'uncategorized'), ...(record.trigger_words.length ? [record.trigger_words.slice(0, 4).join('/')] : [])].join(' · ');
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
    // 基本采样
    const basicGroup = ctx.ui.h('div', 'coo-group');
    const basicTitle = ctx.ui.h('div', 'coo-group-title', t('基本采样', 'Sampler'));
    const basicGrid = ctx.ui.h('div', 'coo-group-grid');
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
    const randBtn = document.createElement('button'); randBtn.className='coo-info-btn'; randBtn.title = t('随机生成种子','Randomize seed'); randBtn.append(svgIcon('shuffle',14));
    randBtn.addEventListener('click', () => { state.seed = -1; seedInput.value = '-1'; });
    advBody.append(ctx.ui.field(t('批次', 'Batch'), batchInput), ctx.ui.field(t('种子', 'Seed'), seedInput), randBtn);
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

    // Sticky 操作按钮 - 全宽底部固定，不遮挡内容
    const sticky = ctx.ui.h('div', 'coo-sticky-bar');
    const stickyHint = ctx.ui.h('div', 'hint', '');
    const generateBtn = ctx.ui.button(t('生成', 'Generate'), { variant: 'primary' });
    const cancelBtn = ctx.ui.button(t('取消', 'Cancel'));
    const openBtn = ctx.ui.button(t('打开目录', 'Open folder'), { variant: 'plain', size: 'sm' });
    cancelBtn.disabled = true;
    cancelBtn.style.border = '1px solid var(--line, rgba(127,127,127,.3))';
    sticky.append(stickyHint, generateBtn, cancelBtn, openBtn);
    ctx.root.append(sticky);
    const genLine = ctx.ui.msgline(''); left.append(genLine);
    const say = (text: string, bad = false): void => { genLine.textContent = text; genLine.classList.toggle('bad', bad); stickyHint.textContent = text; };

    const isActive = (task: GenerateTaskView | null): boolean => !!task && (task.status === 'queued' || task.status === 'running');
    const updateGenerateEnabled = (): void => {
      const needsCkpt = checkpoints.length === 0 && !(presets.find(p => p.id === state.workflow)?.warnings?.join('') ?? '').includes('无需');
      // 简化：有 checkpoint 列表为空时禁用生成，提示选择
      const missingCkpt = checkpoints.length === 0;
      // 若工作流确实需要而没有，禁用
      const mustHave = checkpoints.length === 0;
      // 若有列表但未选
      const notSelected = checkpoints.length > 0 && !state.checkpoint;
      const shouldDisable = (mustHave || notSelected) && !isActive(current);
      // 但若当前工作流无需 checkpoint，则不禁用
      const preset = presets.find(p=>p.id===state.workflow);
      const noNeed = preset && (preset.kind === 'imported' && checkpoints.length===0); // fallback
      // 实际禁用逻辑：没有 checkpoint 且工作流需要时禁用
      let disable = false;
      let hint = '';
      if (checkpoints.length === 0) {
        // 检查是否真的需要
        // 若 mapping 中无 checkpoint 则不需
        // 我们暂时保守：若预设为内置 txt2img/img2img/controlnet 则需要
        const needs = ['quick-txt2img','quick-img2img','quick-controlnet'].includes(state.workflow) || (preset?.kind==='txt2img' || preset?.kind==='img2img' || preset?.kind==='controlnet');
        if (needs) { disable = true; hint = t('请先选择 Checkpoint 模型', 'Select a checkpoint first'); }
      } else if (!state.checkpoint) { disable = true; hint = t('请先选择 Checkpoint 模型', 'Select a checkpoint first'); }
      generateBtn.disabled = disable || busy || isActive(current);
      if (disable && hint) stickyHint.textContent = hint;
      // 样式提示
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
      const preset = presets.find((item) => item.id === state.workflow);
      workflowHint.textContent = preset ? t(`${preset.name}${preset.builtin ? '（内置）' : '（导入）'} · 参数映射 ${preset.mapping_count} 项${preset.warnings?.length ? ` · ${preset.warnings[0]}` : ''}`, `${preset.name}${preset.builtin ? ' (built-in)' : ' (imported)'} · ${preset.mapping_count} mapped${preset.warnings?.length ? ` · ${preset.warnings[0]}` : ''}`) : '';
      renderCheckpointEmpty(); renderExtra(); updateGenerateEnabled();
    });
    const initialPreset = presets.find((item) => item.id === state.workflow);
    if (initialPreset) workflowHint.textContent = t(`${initialPreset.name} · 参数映射 ${initialPreset.mapping_count} 项`, `${initialPreset.name} · ${initialPreset.mapping_count} mapped`);
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
    const connMeta = ctx.ui.h('div', 'coo-conn-kv');
    const kvRow = (k:string, v: string|HTMLElement, action?: HTMLElement): HTMLElement => {
      const kk = ctx.ui.h('div','k', k);
      const vv = ctx.ui.h('div','v');
      if(typeof v==='string'){ const span=ctx.ui.h('span','truncate', v); span.title=v; vv.append(span); } else vv.append(v);
      if(action) vv.append(action);
      const wrap = ctx.ui.h('div',''); wrap.style.display='contents'; wrap.append(kk, vv);
      return wrap;
    };
    const renderConnMeta = (): void => {
      connMeta.replaceChildren();
      const versionVal = `${boot.health.version? 'v'+boot.health.version : ''} ${boot.health.system ?? ''}`.trim() || '—';
      const deviceRaw = boot.health.devices?.[0] ?? '—';
      const deviceEl = ctx.ui.h('span','truncate', deviceRaw); deviceEl.title = deviceRaw;
      const addrText = ctx.ui.h('span','truncate', boot.config.url); addrText.title = boot.config.url;
      const editBtn = ctx.ui.button(t('编辑','Edit'), { size: 'sm' }); editBtn.addEventListener('click', () => { urlRow.style.display = urlRow.style.display === 'none' ? 'flex' : 'none'; });
      const openOut = ctx.ui.button(t('打开','Open'), { size: 'sm' }); openOut.addEventListener('click', () => { void ctx.invoke('openFolder').then(()=>ctx.ui.toast(t('已请求打开','Opening'))).catch(e=>ctx.ui.toast(errText(e),'bad')); });
      const outText = ctx.ui.h('span','truncate', boot.config.output_dir); outText.title = boot.config.output_dir;
      connMeta.append(
        kvRow(t('状态','Status'), boot.health.ok ? t('在线','Online') : t('离线','Offline')),
        kvRow(t('版本','Version'), versionVal),
        kvRow(t('设备','Device'), deviceEl),
        kvRow(t('地址','URL'), addrText, editBtn),
        kvRow(t('模型','Model'), `Checkpoint ${checkpoints.length} · LoRA ${loras.length}`),
        kvRow(t('输出','Output'), outText, openOut),
      );
    };
    renderConnMeta();
    const urlRow = ctx.ui.h('div', 'coo-conn-url-row'); urlRow.style.display = 'none';
    const urlInput = ctx.ui.input({ value: boot.config.url, cls: 'mono' });
    const saveUrl = ctx.ui.button(t('保存地址','Save URL'), { size: 'sm' });
    const checkBtn = ctx.ui.button(t('检测','Check'), { size: 'sm' });
    urlRow.append(urlInput, saveUrl, checkBtn);
    const connActions = ctx.ui.h('div', 'coo-conn-actions');
    const launchBtn = ctx.ui.button(t('一键启动','Launch'), { size: 'sm', variant: 'primary' }); launchBtn.disabled = !boot.launch.configured;
    const stopBtn = ctx.ui.button(t('关闭 ComfyUI','Stop ComfyUI'), { size: 'sm', variant: 'plain' }); stopBtn.disabled = !boot.launch.stop_configured;
    stopBtn.style.color = 'var(--danger, #c44)';
    const refreshBtn = ctx.ui.button(t('刷新','Refresh'), { size: 'sm' }); refreshBtn.prepend(svgIcon('refresh',14));
    connActions.append(launchBtn, refreshBtn, stopBtn);
    if (!boot.launch.configured || !boot.launch.stop_configured) {
      const warn = ctx.ui.msgline(t(!boot.launch.configured ? '没有配置启动脚本。到 World 设置里填「ComfyUI 启动脚本」后可一键启动。' : '没有配置关闭脚本。到 World 设置里填「ComfyUI 关闭脚本」后可一键关闭。', !boot.launch.configured ? 'No launch script. Set it in World settings.' : 'No stop script. Set it in World settings.'), true);
      connCard.append(connHead, connMeta, urlRow, connActions, warn);
    } else {
      connCard.append(connHead, connMeta, urlRow, connActions);
    }
    if (boot.warnings.length) connCard.append(ctx.ui.msgline(boot.warnings.join(' · '), true));
    const healthLine = ctx.ui.msgline(''); healthLine.style.fontSize = '12px'; connCard.append(healthLine);
    right.append(connCard);

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
      } catch (e) { healthLine.classList.add('bad'); healthLine.textContent = t('刷新失败：','Refresh failed: ') + errText(e); }
    };
    saveUrl.addEventListener('click', () => {
      const value = urlInput.value.trim();
      if (!/^https?:\/\//i.test(value)) { healthLine.classList.add('bad'); healthLine.textContent = t('地址要以 http:// 或 https:// 开头','URL must start with http:// or https://'); return; }
      void (async () => {
        try { await ctx.setConfig('world:draw-local', { 'worlds.draw.localUrl': value }); boot.config.url = value; ctx.ui.toast(t('地址已保存，正在检测…','URL saved; checking…')); const res = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health'); boot.health = res.health; renderHealth(res.health); await doRefreshModels(); } catch(e){ healthLine.classList.add('bad'); healthLine.textContent = errText(e); }
      })();
    });
    refreshBtn.addEventListener('click', () => { void doRefreshModels(); });
    checkBtn.addEventListener('click', () => {
      void (async () => { try { const res = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health'); if (!alive) return; boot.health = res.health; renderHealth(res.health); if (res.health.ok) await doRefreshModels(); } catch(e){ healthLine.classList.add('bad'); healthLine.textContent = errText(e); } })();
    });
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
        progress.setValue(0,1); progress.setLabel(t('空闲','Idle')); stageLine.textContent=t('空闲','Idle'); stageLine.style.display=''; progressDetail.textContent = ''; progressDetail.style.display='none'; previewImg.style.display='none'; viewWorksBtn.style.display='none';
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
    openBtn.addEventListener('click', ()=>{ void ctx.invoke('openFolder').then(()=>ctx.ui.toast(t('已请求打开文件夹','Opening folder'))).catch(e=>ctx.ui.toast(errText(e),'bad')); });
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
    // 若共享为空则取 boot
    shared.history = allHistory;
    // 尝试刷新更多
    let pageLimit = Math.max(50, boot.config.history_limit);
    const fetchHistory = async (limit = pageLimit): Promise<void> => {
      try {
        const res = await ctx.invoke<HistoryResponse>('history', [limit]);
        if (!alive) return; allHistory = res.history; shared.history = allHistory; renderGallery();
        if (res.task) { shared.current = res.task; }
      } catch {}
    };

    const root = ctx.ui.h('div', 'coo-works');
    const left = ctx.ui.h('div', 'coo-works-gallery');
    const right = ctx.ui.h('div', 'coo-works-detail');
    root.append(left, right);
    ctx.root.append(root);

    // 左栏标题
    const titleRow = ctx.ui.h('div', '');
    const title = ctx.ui.h('div', 'coo-group-title', t('作品画廊','Gallery'));
    titleRow.append(title);
    left.append(titleRow);

    // 筛选栏
    const filters = ctx.ui.h('div', 'coo-works-filters');
    const searchInput = ctx.ui.input({ type: 'search', placeholder: t('搜索提示词关键字','Search prompts') }); searchInput.style.flex='1';
    const dateFrom = ctx.ui.input({ type: 'date' }); dateFrom.title = t('开始日期','From');
    const dateTo = ctx.ui.input({ type: 'date' }); dateTo.title = t('结束日期','To');
    const modelSelect = ctx.ui.select({ options: [t('全部模型','All models')] }); modelSelect.title=t('模型','Model');
    const sizeSelect = ctx.ui.select({ options: [t('全部尺寸','All sizes'), ...SIZE_PRESETS.filter(p=>p.value!=='custom').map(p=>p.value)] });
    const favSelect = ctx.ui.select({ options: [{ value:'', label:t('全部','All') }, { value:'fav', label:t('收藏','Favorites') }] });
    filters.append(searchInput, dateFrom, dateTo, modelSelect, sizeSelect, favSelect);
    left.append(filters);

    // 填充模型下拉
    {
      const models = [...new Set(allHistory.map(h=>h.checkpoint).filter(Boolean))].sort();
      modelSelect.replaceChildren(); const optAll = document.createElement('option'); optAll.value=''; optAll.textContent=t('全部模型','All models'); modelSelect.append(optAll);
      for (const m of models) { const o=document.createElement('option'); o.value=m; o.textContent=stripExt(m); o.title=m; modelSelect.append(o); }
    }

    const grid = ctx.ui.h('div', 'coo-works-grid');
    const statusLine = ctx.ui.msgline('');
    const loadMoreBtn = ctx.ui.button(t('加载更多','Load more'), { size: 'sm' });
    loadMoreBtn.style.display = allHistory.length >= pageLimit ? '' : 'none';
    left.append(grid, statusLine, loadMoreBtn);

    // 批量模式
    const batchRow = ctx.ui.h('div', 'coo-batch-bar');
    const batchToggle = ctx.ui.button(t('批量模式','Batch'), { size: 'sm' });
    const batchActions = ctx.ui.h('div', 'coo-batch-bar'); batchActions.style.display='none';
    const selCount = ctx.ui.msgline(''); selCount.style.fontSize='12px';
    const batchDel = ctx.ui.button(t('批量删除','Delete selected'), { size: 'sm', variant: 'plain' });
    const batchExport = ctx.ui.button(t('批量导出','Export'), { size: 'sm' });
    batchActions.append(batchDel, batchExport, selCount);
    batchRow.append(batchToggle, batchActions);
    left.append(batchRow);
    let batchMode = false;
    const selected = new Set<string>();
    batchToggle.addEventListener('click', ()=>{ batchMode=!batchMode; batchToggle.textContent = batchMode ? t('退出批量','Exit batch') : t('批量模式','Batch'); batchActions.style.display = batchMode ? '' : 'none'; if (!batchMode) { selected.clear(); selCount.textContent=''; renderGallery(); } });
    batchDel.addEventListener('click', async ()=>{
      if (!selected.size) return; const ok = await ctx.ui.confirm({ title: t('批量删除？', 'Delete selected?'), body: t(`确定删除 ${selected.size} 张？此操作仅清理索引，文件仍在文件夹中。`, `Delete ${selected.size} pictures? Only index is cleared.`), danger: true }); if (!ok) return; // 前端移除
      allHistory = allHistory.filter(h=> !selected.has(h.id)); shared.history = allHistory; selected.clear(); selCount.textContent=''; renderGallery();
      ctx.ui.toast(t('已从画廊移除（文件未删）','Removed from gallery (files kept)'));
    });
    batchExport.addEventListener('click', ()=>{ ctx.ui.toast(t('已请求打开文件夹，请手动复制','Open folder to copy')); void ctx.invoke('openFolder'); });

    // 右栏详情
    const detailTitle = ctx.ui.h('div', 'coo-group-title', t('详情与操作','Details & actions'));
    right.append(detailTitle);
    const preview = document.createElement('img'); preview.className='coo-works-preview'; preview.alt=''; preview.style.display='none';
    const empty = ctx.ui.placeholder(t('点击左侧缩略图查看大图与操作','Click a thumbnail to view details'));
    right.append(preview, empty);
    const metaCard = ctx.ui.sheet({ title: t('元信息','Metadata') }); right.append(metaCard.el);
    const metaGrid = ctx.ui.h('div', 'coo-meta-grid'); metaCard.body.append(metaGrid);
    const opsCard = ctx.ui.sheet({ title: t('操作','Actions') }); right.append(opsCard.el);
    const opsRow = ctx.ui.h('div', 'coo-ops'); opsCard.body.append(opsRow);

    let activeEntry: HistoryEntry | null = shared.resultEntry ?? allHistory[0] ?? null;
    let previewUrl = '';
    ctx.own({ dispose: ()=>{ if (previewUrl) URL.revokeObjectURL(previewUrl); } });
    const imageUrls: string[] = []; ctx.own({ dispose: ()=>{ for(const u of imageUrls) URL.revokeObjectURL(u); } });

    const buildMeta = (entry: HistoryEntry): void => {
      metaGrid.replaceChildren();
      const addRow = (k: string, v: string | HTMLElement, copyVal?: string): void => {
        const kk = ctx.ui.h('div','k', k); const vv = ctx.ui.h('div','v'); if (typeof v==='string') vv.textContent=v; else vv.append(v);
        const copy = copyVal ? ctx.ui.copyButton(()=>copyVal, { size:'sm', label: t('复制','Copy') }) : null;
        metaGrid.append(kk, vv, copy ?? ctx.ui.h('span',''));
      };
      addRow(t('文件名','File'), entry.filename, entry.filename);
      addRow(t('种子','Seed'), String(entry.seed), String(entry.seed));
      addRow(t('尺寸','Size'), `${entry.width}×${entry.height}`);
      const loraText = entry.loras.length ? entry.loras.map(l=> `${stripExt(l.name)}@${l.weight}`).join(' + ') : t('无','None');
      // LoRA 可展开
      const loraSpan = document.createElement('span'); loraSpan.textContent = entry.loras.length>2 ? `${loraText.slice(0, 60)}…` : loraText;
      if (entry.loras.length>2) { const exp = ctx.ui.button(t('展开 ▼','Expand ▼'), { size:'sm'}); exp.addEventListener('click', ()=>{ loraSpan.textContent = loraText; exp.style.display='none'; }); loraSpan.append(exp); }
      addRow('LoRA', loraSpan);
      addRow(t('时间','Time'), shortDate(entry.created_at));
      addRow(t('模型','Model'), stripExt(entry.checkpoint), entry.checkpoint);
      const promptBrief = ctx.ui.h('div','', entry.positive.slice(0, 120)+(entry.positive.length>120?'…':'')); const expandPrompt = ctx.ui.button(t('展开 ▼','Expand ▼'), { size:'sm'}); const promptRowV = ctx.ui.h('div',''); promptRowV.append(promptBrief);
      if (entry.positive.length>80){ expandPrompt.addEventListener('click', ()=>{ promptBrief.textContent = entry.positive; expandPrompt.style.display='none'; }); promptRowV.append(expandPrompt); }
      addRow(t('提示词','Prompt'), promptRowV, entry.positive);
      if (entry.negative) addRow(t('反向','Negative'), entry.negative.slice(0,80)+(entry.negative.length>80?'…':''), entry.negative);
    };
    const buildOps = (entry: HistoryEntry | null): void => {
      opsRow.replaceChildren();
      if (!entry) { opsRow.append(ctx.ui.msgline(t('请选择一张图','Select a picture'))); return; }
      const redraw = ctx.ui.button(t('重画','Repaint'), { size:'sm', variant:'primary' }); redraw.addEventListener('click', ()=>{
        // 同参同种子重画：把状态写回共享并切换到出图
        (window as any).__coo_draw_repaint = { entry, mode: 'sameSeed' };
        ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab', { detail: 'studio', bubbles: true })); const m = ctx as unknown as { switchTab?: (v:string)=>void }; if (m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('已切换到出图页，将用相同参数重画','Switched to Studio; repaint with same seed'));
      });
      const tweak = ctx.ui.button(t('微调','Tweak'), { size:'sm'}); tweak.addEventListener('click', ()=>{
        (window as any).__coo_draw_repaint = { entry, mode: 'randomSeed' }; ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab', { detail:'studio', bubbles:true })); const m=ctx as unknown as {switchTab?:(v:string)=>void}; if(m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('已切换到出图页，种子将随机','Switched to Studio; seed randomized'));
      });
      const useAll = ctx.ui.button(t('使用全部参数','Use all params'), { size:'sm'}); useAll.addEventListener('click', ()=>{
        (window as any).__coo_draw_repaint = { entry, mode: 'useAll' }; ctx.root.dispatchEvent(new CustomEvent('coo-switch-tab',{detail:'studio',bubbles:true})); const m=ctx as unknown as {switchTab?:(v:string)=>void}; if(m.switchTab) m.switchTab('studio'); ctx.ui.toast(t('参数已回填到出图页','Params filled to Studio'));
      });
      const copySeed = ctx.ui.copyButton(()=>String(entry.seed), { label: t('复制种子','Copy seed'), size:'sm' });
      const toPet = ctx.ui.button(t('发送到桌宠','Send to pet'), { size:'sm'}); toPet.addEventListener('click', ()=>{ void ctx.invoke('sendToPet', [entry.id]).then(res=>ctx.ui.toast((res as any).message, (res as any).ok?'ok':'bad')).catch(e=>ctx.ui.toast(errText(e),'bad')); });
      const enlarge = ctx.ui.button(t('放大','Enlarge'), { size:'sm'}); enlarge.addEventListener('click', ()=>{ if (preview.src) ctx.ui.lightbox(preview.src, entry.filename); });
      const fav = ctx.ui.button(t('收藏','Favorite'), { size:'sm'}); fav.addEventListener('click', ()=>{ ctx.ui.toast(t('已收藏（本地标记）','Favorited')); fav.textContent='★ '+t('已收藏','Favorited'); });
      const del = ctx.ui.button(t('删除','Delete'), { size:'sm', variant:'plain'}); del.style.color='#c44'; del.addEventListener('click', async ()=>{
        const ok=await ctx.ui.confirm({ title: t('删除这张？','Delete this?'), body: entry.filename, danger:true }); if(!ok) return; // 仅从画廊移除，不删文件
        allHistory = allHistory.filter(h=>h.id!==entry.id); shared.history=allHistory; renderGallery(); ctx.ui.toast(t('已从画廊移除，文件仍保留在输出目录','Removed from gallery; file kept'));
      });
      const compare = ctx.ui.button(t('对比','Compare'), { size:'sm'}); compare.addEventListener('click', ()=>{
        // 简单对比：让用户再选一张并排
        ctx.ui.toast(t('请再点一张图进行对比','Click another picture to compare'));
        const handler = (e: Event)=>{
          const target = (e.target as HTMLElement).closest('.coo-works-tile') as HTMLElement | null;
          if (!target) return;
          const id = target.dataset.id; if (!id || id===entry.id) return;
          const other = allHistory.find(h=>h.id===id); if (!other) return;
          document.removeEventListener('click', handler);
          // 并排对比 drawer
          const body = document.createElement('div'); body.style.display='flex'; body.style.gap='8px'; body.style.flexWrap='wrap';
          const aImg = document.createElement('img'); aImg.src = preview.src; aImg.style.maxWidth='48%'; aImg.style.borderRadius='8px';
          const bImg = document.createElement('img'); bImg.style.maxWidth='48%'; bImg.style.borderRadius='8px';
          body.append(aImg, bImg);
          void ctx.invokeBinary('image', [other.id]).then(blob=>{ const url=URL.createObjectURL(blob); bImg.src=url; imageUrls.push(url); }).catch(()=>{});
          ctx.ui.drawer(t('对比','Compare'), body);
        };
        setTimeout(()=> document.addEventListener('click', handler, { once:true }), 100);
      });
      const openFolder = ctx.ui.button(t('打开文件夹','Open folder'), { size:'sm'}); openFolder.addEventListener('click', ()=>{ void ctx.invoke('revealImage', [entry.id]).then(()=>ctx.ui.toast(t('已请求在文件管理器中显示','Revealing in file manager'))).catch(()=> void ctx.invoke('openFolder').then(()=>ctx.ui.toast(t('已请求打开文件夹','Opening folder'))).catch(e=>ctx.ui.toast(errText(e),'bad'))); });
      opsRow.append(redraw, tweak, useAll, copySeed, toPet, enlarge, fav, del, compare, openFolder);
    };

    const showDetail = async (entry: HistoryEntry): Promise<void> => {
      activeEntry = entry;
      try {
        const blob = await ctx.invokeBinary('image', [entry.id]);
        if (!alive) return;
        const url = URL.createObjectURL(blob); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = url; preview.src = url; preview.style.display='block'; empty.style.display='none';
      } catch(e){ empty.textContent = errText(e); empty.style.display=''; preview.style.display='none'; }
      buildMeta(entry); buildOps(entry);
      // 高亮选中
      for (const el of Array.from(grid.querySelectorAll('.coo-works-tile'))) { (el as HTMLElement).classList.toggle('sel', (el as HTMLElement).dataset.id===entry.id); }
    };

    const filtered = (): HistoryEntry[] => {
      const q = searchInput.value.trim().toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value).getTime() : 0;
      const to = dateTo.value ? new Date(dateTo.value).getTime() + 86400000 : Infinity;
      const model = modelSelect.value;
      const size = sizeSelect.value;
      return allHistory.filter(h=>{
        if (q && !(`${h.positive} ${h.negative} ${h.filename}`.toLowerCase().includes(q))) return false;
        if (h.created_at < from || h.created_at > to) return false;
        if (model && h.checkpoint !== model) return false;
        if (size && size !== t('全部尺寸','All sizes') && size !== 'All sizes' && `${h.width}x${h.height}` !== size) return false;
        // fav filter stub
        return true;
      });
    };

    const renderGallery = (): void => {
      const list = filtered();
      grid.replaceChildren();
      statusLine.textContent = list.length ? t(`共 ${list.length} 张 · ${boot.config.output_dir}`, `${list.length} pictures · ${boot.config.output_dir}`) : t('没有匹配的作品，试着改筛选或搜索','No matches; adjust filters');
      loadMoreBtn.style.display = allHistory.length < pageLimit ? 'none' : '';
      // 新图置顶且带 NEW 标记（通过共享 lastFinished 判断）
      for (const entry of list.slice(0, loadMoreBtn.style.display==='' ? pageLimit : 2000)) {
        const tile = ctx.ui.h('button', 'coo-works-tile'); tile.type='button'; (tile as HTMLElement).dataset.id = entry.id;
        if (activeEntry?.id===entry.id) tile.classList.add('sel');
        const img = ctx.ui.h('img',''); img.alt = entry.filename; img.loading='lazy'; img.dataset.id = entry.id;
        const label = ctx.ui.h('span','lab', `${entry.seed} · ${entry.width}×${entry.height}`);
        // hover 预览完整比例：用 title 展示
        tile.title = `${entry.filename}\n${entry.positive.slice(0,120)}`;
        // batch checkbox
        if (batchMode) {
          const chk = document.createElement('input'); chk.type='checkbox'; chk.className='chk'; chk.checked = selected.has(entry.id);
          chk.addEventListener('click', (e)=>{ e.stopPropagation(); if (chk.checked) selected.add(entry.id); else selected.delete(entry.id); selCount.textContent = selected.size ? t(`已选 ${selected.size} 张`, `${selected.size} selected`) : ''; });
          tile.append(chk);
        }
        tile.append(img, label);
        tile.addEventListener('click', ()=>{ if (batchMode) { if (selected.has(entry.id)) selected.delete(entry.id); else selected.add(entry.id); selCount.textContent = selected.size ? t(`已选 ${selected.size} 张`, `${selected.size} selected`) : ''; renderGallery(); return; } void showDetail(entry); });
        grid.append(tile);
        // lazy load image
        void ctx.invokeBinary('image', [entry.id]).then(blob=>{ if (!alive) return; const url=URL.createObjectURL(blob); imageUrls.push(url); img.src=url; }).catch(()=>{ img.alt='×'; });
        // 新图红点
        if (entry.id === shared.current?.images[0]?.id) {
          const badge = ctx.ui.h('span','pill', 'NEW'); (badge as HTMLElement).style.position='absolute'; (badge as HTMLElement).style.top='6px'; (badge as HTMLElement).style.right='6px'; (badge as HTMLElement).style.fontSize='10px'; (badge as HTMLElement).style.background='rgba(220,60,60,.9)'; (badge as HTMLElement).style.color='#fff'; tile.style.position='relative'; tile.append(badge);
        }
      }
      if (list.length===0) { grid.append(ctx.ui.placeholder(t('没有作品','No works'))); }
    };

    searchInput.addEventListener('input', renderGallery);
    dateFrom.addEventListener('change', renderGallery);
    dateTo.addEventListener('change', renderGallery);
    modelSelect.addEventListener('change', renderGallery);
    sizeSelect.addEventListener('change', renderGallery);
    favSelect.addEventListener('change', renderGallery);
    loadMoreBtn.addEventListener('click', async ()=>{
      pageLimit += 50;
      await fetchHistory(pageLimit);
      loadMoreBtn.style.display = allHistory.length >= pageLimit ? '' : 'none';
      ctx.ui.toast(t(`已加载至 ${allHistory.length} 张`,`Loaded ${allHistory.length}`));
    });

    // 自动选中第一张或共享结果
    renderGallery();
    if (activeEntry) void showDetail(activeEntry);
    else if (allHistory[0]) void showDetail(allHistory[0]);

    // 监听新图生成事件：若有新图，自动置顶并选中
    const onNewImage = (): void => { void fetchHistory(pageLimit); };
    // 简单轮询新图：若共享 current 变为 done 则刷新
    ctx.interval(async ()=>{
      if (!alive) return;
      try { const res = await ctx.invoke<HistoryResponse>('history', [pageLimit]); if (!alive) return; if (res.history.length !== allHistory.length || res.history[0]?.id !== allHistory[0]?.id) { allHistory = res.history; shared.history = allHistory; // 更新模型下拉
        const models = [...new Set(allHistory.map(h=>h.checkpoint).filter(Boolean))].sort(); modelSelect.replaceChildren(); const optAll=document.createElement('option'); optAll.value=''; optAll.textContent=t('全部模型','All models'); modelSelect.append(optAll); for(const m of models){ const o=document.createElement('option'); o.value=m; o.textContent=stripExt(m); modelSelect.append(o);} renderGallery(); if (res.history[0] && (!activeEntry || activeEntry.id !== res.history[0].id)) { // 自动选中新图
          const newEnt = res.history[0]; // 小红点由 render 处理
          // 可选：自动切换详情
        } } } catch {}
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
