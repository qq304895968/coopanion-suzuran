/**
 * 「出图」面板：连接、参数、LoRA、工作流、进度、结果与历史。
 * 只通过 WebUiPanelContext 与宿主交互；不碰 document.body。
 */
import type {
  WebUiClientBundle, WebUiPanel, WebUiPanelContext, WebUiProgress, WebUiTable,
} from 'cortico/web/shared/client-panel.ts';
import type {
  CooGenBootstrap, DefaultLoRA, GenerateResponse, GenerateTaskView, HistoryEntry, LoRARecord,
  ParamMapping, StatusResponse, WorkflowSummary,
} from '../types.ts';
import './style.css';

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
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ studio */

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
      const sheet = ctx.ui.sheet({ title: t('出图', 'Image studio') });
      sheet.body.append(ctx.ui.msgline(t('读取失败：', 'Failed: ') + errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;

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
    };
    for (const lora of boot.defaults) state.loras.set(lora.path, lora.weight);

    let loras = boot.loras;
    let checkpoints = boot.checkpoints;
    let controlNets = boot.control_nets ?? [];
    let presets = boot.presets;
    let history = boot.history;
    let current: GenerateTaskView | null = boot.task;
    let lastFinished = '';
    let resultUrl = '';
    let resultEntry: HistoryEntry | null = null;
    let resultTaskId = '';
    let busy = false;

    ctx.own({ dispose: () => { if (resultUrl) URL.revokeObjectURL(resultUrl); } });

    /* ------------------------------------------------------------- connection */

    const conn = ctx.ui.sheet({
      title: t('连接', 'Connection'),
      desc: t('出图走本机 ComfyUI；离线时点「一键启动」或手动启动。', 'Pictures come from local ComfyUI; start it with the button or by hand.'),
    });
    ctx.root.append(conn.el);

    const healthLine = ctx.ui.msgline('');
    const healthMeta = ctx.ui.msgline('');
    const urlRow = ctx.ui.rowbar();
    const urlInput = ctx.ui.input({ value: boot.config.url, cls: 'mono' });
    urlInput.style.flex = '1';
    urlInput.style.minWidth = '240px';
    const saveUrl = ctx.ui.button(t('保存地址', 'Save URL'), { size: 'sm' });
    const checkBtn = ctx.ui.button(t('检测', 'Check'), { size: 'sm' });
    const launchBtn = ctx.ui.button(t('一键启动', 'Launch'), { size: 'sm', variant: 'primary' });
    launchBtn.disabled = !boot.launch.configured;
    const stopBtn = ctx.ui.button(t('关闭 ComfyUI', 'Stop ComfyUI'), { size: 'sm', variant: 'plain' });
    stopBtn.disabled = !boot.launch.stop_configured;
    const refreshBtn = ctx.ui.button(t('刷新模型/LoRA', 'Refresh models/LoRAs'), { size: 'sm' });
    urlRow.append(urlInput, saveUrl, checkBtn, launchBtn, stopBtn, refreshBtn);
    conn.body.append(healthLine, healthMeta, urlRow);

    if (!boot.launch.configured || !boot.launch.stop_configured) {
      conn.body.append(ctx.ui.msgline(t(
        !boot.launch.configured
          ? '没有配置启动脚本。到 World 设置里填「ComfyUI 启动脚本」（.bat / .ps1 / .exe）后这里就能一键启动。'
          : '没有配置关闭脚本。到 World 设置里填「ComfyUI 关闭脚本」后这里就能一键关闭。',
        !boot.launch.configured
          ? 'No launch script configured. Set “ComfyUI launch script” in World settings.'
          : 'No stop script configured. Set “ComfyUI stop script” in World settings.',
      ), true));
    }
    if (boot.warnings.length) {
      const warn = ctx.ui.msgline(boot.warnings.join(' · '), true);
      conn.body.append(warn);
    }

    const renderHealth = (health: CooGenBootstrap['health']): void => {
      healthLine.classList.toggle('bad', !health.ok);
      healthLine.textContent = health.ok
        ? t(`ComfyUI 在线：${health.system ?? health.url}`, `ComfyUI online: ${health.system ?? health.url}`)
        : t(`ComfyUI 离线：${health.error ?? health.url}`, `ComfyUI offline: ${health.error ?? health.url}`);
      healthMeta.textContent = [
        t('地址', 'URL'),
        health.url,
        ...(health.devices?.length ? [health.devices[0]!] : []),
        t('已保存', 'output'),
        boot.config.output_dir,
      ].join(' · ');
    };
    renderHealth(boot.health);

    const applyModelRefresh = (res: {
      checkpoints: string[];
      samplers: string[];
      schedulers: string[];
      control_nets: string[];
      loras: LoRARecord[];
      health: CooGenBootstrap['health'];
    }): void => {
      checkpoints = res.checkpoints;
      loras = res.loras;
      controlNets = res.control_nets ?? [];
      boot.health = res.health;
      setOptions(checkpointSelect, checkpoints, state.checkpoint);
      if (!checkpoints.includes(state.checkpoint)) state.checkpoint = checkpoints[0] ?? state.checkpoint;
      setOptions(samplerSelect, res.samplers, state.sampler);
      setOptions(schedulerSelect, res.schedulers, state.scheduler);
      renderHealth(res.health);
      renderLoraTable();
      renderHealthMeta();
      renderExtra();
    };

    const renderHealthMeta = (): void => {
      healthMeta.textContent = [
        t('地址', 'URL'),
        boot.config.url,
        `${t('Checkpoint', 'checkpoints')} ${checkpoints.length}`,
        `LoRA ${loras.length}`,
        t('默认', 'defaults'),
        boot.defaults.length,
        t('输出', 'output'),
        boot.config.output_dir,
      ].join(' · ');
    };

    saveUrl.addEventListener('click', () => {
      const value = urlInput.value.trim();
      if (!/^https?:\/\//i.test(value)) {
        healthLine.classList.add('bad');
        healthLine.textContent = t('地址要以 http:// 或 https:// 开头', 'The URL must start with http:// or https://');
        return;
      }
      void (async () => {
        try {
          await ctx.setConfig('world:coo-gen', { 'worlds.coo-gen.url': value });
          boot.config.url = value;
          ctx.ui.toast(t('地址已保存，正在检测…', 'URL saved; checking…'));
          const res = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health');
          boot.health = res.health;
          renderHealth(res.health);
          await doRefreshModels();
        } catch (error) {
          healthLine.classList.add('bad');
          healthLine.textContent = errText(error);
        }
      })();
    }, { signal: ctx.signal });

    const doRefreshModels = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<{
          checkpoints: string[]; diffusion_models?: string[]; model_root?: string;
          samplers: string[]; schedulers: string[]; control_nets: string[];
          loras: LoRARecord[]; health: CooGenBootstrap['health'];
        }>('refreshModels');
        if (!alive) return;
        applyModelRefresh(res);
      } catch (error) {
        healthLine.classList.add('bad');
        healthLine.textContent = t('刷新失败：', 'Refresh failed: ') + errText(error);
      }
    };

    refreshBtn.addEventListener('click', () => { void doRefreshModels(); }, { signal: ctx.signal });

    checkBtn.addEventListener('click', () => {
      void (async () => {
        try {
          const res = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health');
          if (!alive) return;
          boot.health = res.health;
          renderHealth(res.health);
          if (res.health.ok) await doRefreshModels();
        } catch (error) {
          healthLine.classList.add('bad');
          healthLine.textContent = errText(error);
        }
      })();
    }, { signal: ctx.signal });

    launchBtn.addEventListener('click', () => {
      void (async () => {
        const busyHandle = ctx.ui.busy(t('启动 ComfyUI', 'Launching ComfyUI'), t('等待 /system_stats 就绪…', 'Waiting for /system_stats…'));
        launchBtn.disabled = true;
        stopBtn.disabled = true;
        try {
          const res = await ctx.invoke<{ ok: boolean; message: string }>('launch');
          if (!alive) return;
          ctx.ui.toast(res.message, res.ok ? 'ok' : 'bad');
          healthLine.classList.toggle('bad', !res.ok);
          healthLine.textContent = res.message;
          if (res.ok) await doRefreshModels();
        } catch (error) {
          ctx.ui.toast(errText(error), 'bad');
        } finally {
          busyHandle.dispose();
          launchBtn.disabled = !boot.launch.configured;
          stopBtn.disabled = !boot.launch.stop_configured;
        }
      })();
    }, { signal: ctx.signal });

    stopBtn.addEventListener('click', () => {
      void (async () => {
        const busyHandle = ctx.ui.busy(t('关闭 ComfyUI', 'Stopping ComfyUI'), t('正在等待进程退出…', 'Waiting for the process to exit…'));
        stopBtn.disabled = true;
        launchBtn.disabled = true;
        try {
          const res = await ctx.invoke<{ ok: boolean; message: string }>('stop');
          if (!alive) return;
          ctx.ui.toast(res.message, res.ok ? 'ok' : 'bad');
          healthLine.classList.toggle('bad', !res.ok);
          healthLine.textContent = res.message;
          const health = await ctx.invoke<{ health: CooGenBootstrap['health'] }>('health');
          if (!alive) return;
          boot.health = health.health;
          renderHealth(health.health);
        } catch (error) {
          ctx.ui.toast(errText(error), 'bad');
        } finally {
          busyHandle.dispose();
          launchBtn.disabled = !boot.launch.configured;
          stopBtn.disabled = !boot.launch.stop_configured;
        }
      })();
    }, { signal: ctx.signal });

    /* --------------------------------------------------------------- generate */

    const gen = ctx.ui.sheet({
      title: t('生成', 'Generate'),
      desc: t('用户自己的图：模型、LoRA、采样参数都在这里选。', 'Your own picture: pick checkpoint, LoRAs and sampler settings here.'),
    });
    ctx.root.append(gen.el);

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
    gen.body.append(workflowRow, workflowHint);

    const positive = ctx.ui.textarea({
      value: '',
      rows: 4,
      placeholder: t('想画什么？例如：塞尔达站在海边看日落，金色时刻，电影感', 'What should it be? e.g. Zelda watching the sunset by the sea, golden hour, cinematic'),
      onInput: (value) => { state.positive = value; },
    });
    positive.style.width = '100%';
    gen.body.append(ctx.ui.field(t('正向提示词', 'Positive prompt'), positive));

    const negative = ctx.ui.textarea({
      value: state.negative,
      rows: 2,
      onInput: (value) => { state.negative = value; },
    });
    negative.style.width = '100%';
    gen.body.append(ctx.ui.field(t('反向提示词', 'Negative prompt'), negative));

    const modelRow = ctx.ui.rowbar();
    const checkpointSelect = ctx.ui.select({ options: [] });
    setOptions(checkpointSelect, checkpoints, state.checkpoint);
    checkpointSelect.addEventListener('change', () => { state.checkpoint = checkpointSelect.value; }, { signal: ctx.signal });
    modelRow.append(ctx.ui.field(t('模型', 'Checkpoint'), checkpointSelect));
    const loraCount = ctx.ui.msgline('');
    modelRow.append(loraCount);
    gen.body.append(modelRow);
    renderHealthMeta();

    const loraSearch = ctx.ui.input({ type: 'search', placeholder: t('搜索 LoRA（名称/别名/分类/触发词）', 'Search LoRAs (name/alias/category/trigger)') });
    loraSearch.style.width = '100%';
    gen.body.append(loraSearch);
    const loraTable: WebUiTable = ctx.ui.table({ head: ['', t('LoRA', 'LoRA'), t('权重', 'Weight')], maxHeight: '230px' });
    gen.body.append(loraTable.el);

    const renderLoraCount = (): void => {
      const missing = boot.defaults.filter((item) => !loras.some((lora) => lora.path === item.path));
      loraCount.textContent = t(
        `已选 ${state.loras.size} 个${missing.length ? ` · 默认里 ${missing.length} 个文件丢失` : ''}`,
        `${state.loras.size} selected${missing.length ? ` · ${missing.length} default file(s) missing` : ''}`,
      );
      loraCount.classList.toggle('bad', missing.length > 0);
    };

    const renderLoraTable = (): void => {
      const query = loraSearch.value.trim().toLowerCase();
      const filtered = loras.filter((item) => !query || [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words]
        .some((value) => value.toLowerCase().includes(query)));
      loraTable.clear(filtered.length ? undefined : t('没有匹配的 LoRA', 'No matching LoRA'));
      for (const record of filtered.slice(0, 300)) {
        const checked = state.loras.has(record.path);
        const box = ctx.ui.checkbox('', {
          checked,
          onChange: (value) => {
            if (value) {
              state.loras.set(record.path, record.weight ?? 0.75);
              weightInput.disabled = false;
              weightInput.value = String(record.weight ?? 0.75);
            } else {
              state.loras.delete(record.path);
              weightInput.disabled = true;
            }
            renderLoraCount();
          },
        });
        box.el.setAttribute('aria-label', record.name);
        const nameCell = document.createElement('div');
        const title = document.createElement('div');
        title.textContent = record.aliases.length ? `${record.name}（${record.aliases.join('/')}）` : record.name;
        const sub = document.createElement('div');
        sub.className = 'coo-gen-sub';
        sub.textContent = [record.path, record.category || t('未分类', 'uncategorized'), ...(record.trigger_words.length ? [record.trigger_words.slice(0, 4).join('/')] : [])].join(' · ');
        nameCell.append(title, sub);
        if (boot.defaults.some((item) => item.path === record.path)) nameCell.append(pill(ctx, t('默认', 'default'), 'on'));
        const weightInput = ctx.ui.input({
          type: 'number',
          value: String(state.loras.get(record.path) ?? record.weight ?? 0.75),
          cls: 'mono coo-gen-weight',
        });
        weightInput.min = '0.05';
        weightInput.max = '2';
        weightInput.step = '0.05';
        weightInput.disabled = !checked;
        weightInput.addEventListener('change', () => {
          const value = Math.min(2, Math.max(0.05, num(weightInput.value, 0.75)));
          weightInput.value = String(value);
          if (state.loras.has(record.path)) state.loras.set(record.path, value);
        }, { signal: ctx.signal });
        loraTable.addRow([box.el, nameCell, weightInput]);
      }
      renderLoraCount();
    };
    loraSearch.addEventListener('input', renderLoraTable, { signal: ctx.signal });
    renderLoraTable();

    const samplerRow = ctx.ui.rowbar();
    const samplerSelect = ctx.ui.select({ options: [] });
    setOptions(samplerSelect, boot.samplers, state.sampler);
    samplerSelect.addEventListener('change', () => { state.sampler = samplerSelect.value; }, { signal: ctx.signal });
    const schedulerSelect = ctx.ui.select({ options: [] });
    setOptions(schedulerSelect, boot.schedulers, state.scheduler);
    schedulerSelect.addEventListener('change', () => { state.scheduler = schedulerSelect.value; }, { signal: ctx.signal });
    samplerRow.append(
      ctx.ui.field(t('采样器', 'Sampler'), samplerSelect),
      ctx.ui.field(t('调度器', 'Scheduler'), schedulerSelect),
    );
    gen.body.append(samplerRow);

    const numberRow = ctx.ui.rowbar();
    const makeNumber = (label: string, key: 'steps' | 'cfg' | 'width' | 'height' | 'batch' | 'seed', min: string, max: string, step: string): HTMLInputElement => {
      const input = ctx.ui.input({ type: 'number', value: String(state[key]), cls: 'mono coo-gen-num' });
      input.min = min;
      input.max = max;
      input.step = step;
      input.addEventListener('change', () => {
        const value = num(input.value, Number(state[key]));
        input.value = String(value);
        (state as unknown as Record<string, unknown>)[key] = value;
      }, { signal: ctx.signal });
      numberRow.append(ctx.ui.field(label, input));
      return input;
    };
    makeNumber(t('步数', 'Steps'), 'steps', '1', '100', '1');
    makeNumber('CFG', 'cfg', '1', '30', '0.5');
    const widthInput = makeNumber(t('宽', 'Width'), 'width', '64', '4096', '8');
    const heightInput = makeNumber(t('高', 'Height'), 'height', '64', '4096', '8');
    makeNumber(t('批次', 'Batch'), 'batch', '1', '8', '1');
    makeNumber(t('种子 (-1 随机)', 'Seed (-1 random)'), 'seed', '-1', '9007199254740991', '1');
    const sizePresets = [
      { value: '768x1152', label: t('768 × 1152（竖图）', '768 × 1152 (portrait)'), width: 768, height: 1152 },
      { value: '512x768', label: '512 × 768', width: 512, height: 768 },
      { value: '1024x1024', label: t('1024 × 1024（方图）', '1024 × 1024 (square)'), width: 1024, height: 1024 },
      { value: '1152x768', label: t('1152 × 768（横图）', '1152 × 768 (landscape)'), width: 1152, height: 768 },
      { value: '832x1216', label: '832 × 1216', width: 832, height: 1216 },
    ];
    const sizeSelect = ctx.ui.select({
      options: sizePresets.map((item) => ({ value: item.value, label: item.label })),
    });
    sizeSelect.addEventListener('change', () => {
      const preset = sizePresets.find((item) => item.value === sizeSelect.value);
      if (!preset) return;
      state.width = preset.width;
      state.height = preset.height;
      widthInput.value = String(preset.width);
      heightInput.value = String(preset.height);
    }, { signal: ctx.signal });
    numberRow.append(ctx.ui.field(t('尺寸预设', 'Size preset'), sizeSelect));
    gen.body.append(numberRow);

    const extraBox = ctx.ui.h('div', 'coo-gen-extra');
    gen.body.append(extraBox);

    const actionRow = ctx.ui.actions();
    const generateBtn = ctx.ui.button(t('生成', 'Generate'), { variant: 'primary' });
    const cancelBtn = ctx.ui.button(t('取消', 'Cancel'));
    const openBtn = ctx.ui.button(t('打开保存目录', 'Open output folder'), { variant: 'plain', size: 'sm' });
    cancelBtn.disabled = true;
    actionRow.append(generateBtn, cancelBtn, openBtn);
    gen.body.append(actionRow);
    const genLine = ctx.ui.msgline('');
    gen.body.append(genLine);

    const say = (text: string, bad = false): void => {
      genLine.textContent = text;
      genLine.classList.toggle('bad', bad);
    };

    const isActive = (task: GenerateTaskView | null): boolean => !!task && (task.status === 'queued' || task.status === 'running');

    const collect = () => ({
      positive: state.positive,
      negative: state.negative,
      checkpoint: state.checkpoint,
      loras: [...state.loras.entries()].map(([path, weight]) => ({ path, weight })),
      sampler: state.sampler,
      scheduler: state.scheduler,
      steps: state.steps,
      cfg: state.cfg,
      width: state.width,
      height: state.height,
      batch: state.batch,
      seed: state.seed,
      workflow: state.workflow,
      ...(state.inputImage ? { inputImage: state.inputImage } : {}),
      ...(state.controlImage ? { controlImage: state.controlImage } : {}),
      ...(state.controlNet ? { controlNet: state.controlNet } : {}),
      ...(state.denoise !== undefined ? { denoise: state.denoise } : {}),
      ...(state.controlStrength !== undefined ? { controlStrength: state.controlStrength } : {}),
      ...(Object.keys(state.custom).length ? { custom: state.custom } : {}),
    });

    const renderExtra = (): void => {
      extraBox.replaceChildren();
      void loadCustomFields();
      const preset = presets.find((item) => item.id === state.workflow);
      const kind = preset?.kind;
      if (kind !== 'img2img' && kind !== 'controlnet') return;
      const row = ctx.ui.rowbar();
      const inputPath = ctx.ui.input({ value: state.inputImage, cls: 'mono', placeholder: t('输入图绝对路径', 'Absolute path to input image') });
      inputPath.style.flex = '1';
      inputPath.style.minWidth = '220px';
      const choose = ctx.ui.button(t('选择…', 'Choose…'), { size: 'sm' });
      choose.addEventListener('click', () => {
        void (async () => {
          try {
            const picked = await ctx.pickPath({ kind: 'file', extensions: ['png', 'jpg', 'jpeg', 'webp'] });
            if (picked) {
              state.inputImage = picked;
              inputPath.value = picked;
            }
          } catch (error) {
            say(errText(error), true);
          }
        })();
      }, { signal: ctx.signal });
      inputPath.addEventListener('change', () => { state.inputImage = inputPath.value.trim(); }, { signal: ctx.signal });
      row.append(ctx.ui.field(t('输入图', 'Input image'), inputPath), choose);
      extraBox.append(row);

      if (kind === 'controlnet') {
        const controlRow = ctx.ui.rowbar();
        const controlPath = ctx.ui.input({ value: state.controlImage, cls: 'mono', placeholder: t('控制图绝对路径', 'Absolute path to control image') });
        controlPath.style.flex = '1';
        controlPath.style.minWidth = '220px';
        const chooseControl = ctx.ui.button(t('选择…', 'Choose…'), { size: 'sm' });
        chooseControl.addEventListener('click', () => {
          void (async () => {
            try {
              const picked = await ctx.pickPath({ kind: 'file', extensions: ['png', 'jpg', 'jpeg', 'webp'] });
              if (picked) {
                state.controlImage = picked;
                controlPath.value = picked;
              }
            } catch (error) {
              say(errText(error), true);
            }
          })();
        }, { signal: ctx.signal });
        controlPath.addEventListener('change', () => { state.controlImage = controlPath.value.trim(); }, { signal: ctx.signal });
        controlRow.append(ctx.ui.field(t('控制图', 'Control image'), controlPath), chooseControl);
        const controlNetSelect = ctx.ui.select({ options: controlNets });
        setOptions(controlNetSelect, controlNets, state.controlNet);
        controlNetSelect.addEventListener('change', () => { state.controlNet = controlNetSelect.value; }, { signal: ctx.signal });
        controlRow.append(ctx.ui.field(t('ControlNet 模型', 'ControlNet model'), controlNetSelect));
        extraBox.append(controlRow);
        const strengthRow = ctx.ui.rowbar();
        const strength = ctx.ui.input({ type: 'number', value: String(state.controlStrength ?? 1), cls: 'mono coo-gen-num' });
        strength.min = '0';
        strength.max = '2';
        strength.step = '0.05';
        strength.addEventListener('change', () => { state.controlStrength = Math.min(2, Math.max(0, num(strength.value, 1))); }, { signal: ctx.signal });
        strengthRow.append(ctx.ui.field(t('控制强度', 'Control strength'), strength));
        extraBox.append(strengthRow);
      }

      const denoiseRow = ctx.ui.rowbar();
      const denoise = ctx.ui.input({ type: 'number', value: String(state.denoise ?? (kind === 'img2img' ? 0.6 : 0.7)), cls: 'mono coo-gen-num' });
      denoise.min = '0.05';
      denoise.max = '1';
      denoise.step = '0.05';
      denoise.addEventListener('change', () => { state.denoise = Math.min(1, Math.max(0.05, num(denoise.value, 0.6))); }, { signal: ctx.signal });
      denoiseRow.append(ctx.ui.field(t('重绘幅度', 'Denoise'), denoise));
      extraBox.append(denoiseRow);
    };

    const KNOWN_PARAMS = new Set([
      'positive', 'negative', 'checkpoint', 'steps', 'cfg', 'seed', 'sampler', 'scheduler',
      'width', 'height', 'batch', 'inputImage', 'controlImage', 'controlNet', 'denoise', 'controlStrength',
    ]);

    async function loadCustomFields(): Promise<void> {
      const workflowId = state.workflow;
      try {
        const res = await ctx.invoke<PresetDetail>('presetDetail', [workflowId]);
        if (!alive || state.workflow !== workflowId || !res.ok || !res.preset) return;
        const custom = res.preset.mapping.filter((item) => !KNOWN_PARAMS.has(item.param));
        if (!custom.length) return;
        const box = ctx.ui.h('div', 'coo-gen-extra');
        box.append(ctx.ui.section(t('自定义参数', 'Custom parameters'), t('从导入工作流里自动识别的参数。', 'Auto-detected from the imported workflow.')));
        for (const map of custom) {
          const current = state.custom[map.param] ?? (typeof map.default === 'number' || typeof map.default === 'string' ? map.default : '');
          const control = map.ui_type === 'number' || map.ui_type === 'slider' || map.ui_type === 'seed'
            ? ctx.ui.input({ type: 'number', value: String(current), cls: 'mono coo-gen-num' })
            : ctx.ui.input({ value: String(current), cls: 'mono' });
          control.addEventListener('change', () => {
            if (map.ui_type === 'number' || map.ui_type === 'slider' || map.ui_type === 'seed') {
              state.custom[map.param] = num(control.value, Number(current) || 0);
            } else {
              state.custom[map.param] = control.value;
            }
          }, { signal: ctx.signal });
          box.append(ctx.ui.field(`${map.ui_label || map.param} (${map.param})`, control));
        }
        extraBox.append(box);
      } catch {
        // 导入工作流没有详情时不影响固定表单。
      }
    }

    workflowSelect.addEventListener('change', () => {
      state.workflow = workflowSelect.value;
      state.custom = {};
      const preset = presets.find((item) => item.id === state.workflow);
      workflowHint.textContent = preset
        ? t(`${preset.name}${preset.builtin ? '（内置）' : '（导入）'} · 参数映射 ${preset.mapping_count} 项${preset.warnings?.length ? ` · ${preset.warnings[0]}` : ''}`, `${preset.name}${preset.builtin ? ' (built-in)' : ' (imported)'} · ${preset.mapping_count} mapped params${preset.warnings?.length ? ` · ${preset.warnings[0]}` : ''}`)
        : '';
      renderExtra();
    }, { signal: ctx.signal });
    const initialPreset = presets.find((item) => item.id === state.workflow);
    if (initialPreset) {
      workflowHint.textContent = t(`${initialPreset.name} · 参数映射 ${initialPreset.mapping_count} 项`, `${initialPreset.name} · ${initialPreset.mapping_count} mapped params`);
    }
    renderExtra();

    /* --------------------------------------------------------------- progress */

    const progressSheet = ctx.ui.sheet({ title: t('进度', 'Progress') });
    ctx.root.append(progressSheet.el);
    const progress: WebUiProgress = ctx.ui.progress({
      max: Math.max(1, state.steps),
      value: 0,
      label: t('等待开始', 'Idle'),
      format: (value, max) => `${Math.round((value / Math.max(1, max)) * 100)}%`,
    });
    const stageLine = ctx.ui.msgline('');
    progressSheet.body.append(progress.el, stageLine);

    const renderTask = (task: GenerateTaskView | null): void => {
      if (!task) {
        progress.setValue(0, 1);
        progress.setLabel(t('空闲', 'Idle'));
        stageLine.textContent = '';
        generateBtn.disabled = busy;
        cancelBtn.disabled = true;
        return;
      }
      const total = Math.max(1, task.progress.total || task.params.steps || 1);
      const current = task.status === 'done' ? total : Math.min(total, task.progress.current || 0);
      progress.setValue(current, total);
      progress.setLabel(task.status === 'done' ? t('完成', 'done') : task.status === 'error' ? t('失败', 'failed') : task.status === 'cancelled' ? t('已取消', 'cancelled') : t('生成中', 'running'));
      const elapsed = task.finished_at ? Math.round((task.finished_at - task.created_at) / 1000) : Math.round((Date.now() - task.created_at) / 1000);
      stageLine.textContent = [
        task.status,
        task.progress.message ?? '',
        `${current}/${total}`,
        `${elapsed}s`,
        task.error ?? '',
      ].filter(Boolean).join(' · ');
      stageLine.classList.toggle('bad', task.status === 'error');
      generateBtn.disabled = busy || isActive(task);
      cancelBtn.disabled = !isActive(task);
    };

    /* --------------------------------------------------------------- result */

    const resultSheet = ctx.ui.sheet({
      title: t('结果', 'Result'),
      desc: t('画好的图会存进保存目录，并写进 PNG 元数据。', 'Saved into the output folder with PNG metadata.'),
    });
    ctx.root.append(resultSheet.el);
    const resultImage = ctx.ui.h('img', 'coo-gen-preview');
    resultImage.alt = '';
    resultImage.style.display = 'none';
    const resultEmpty = ctx.ui.placeholder(t('还没有图。写一句提示词，点「生成」。', 'No picture yet. Write a prompt and press Generate.'));
    const resultCaption = ctx.ui.msgline('');
    const resultActions = ctx.ui.rowbar();
    const resOpen = ctx.ui.button(t('打开文件夹', 'Open folder'), { size: 'sm' });
    const resPet = ctx.ui.button(t('发送到桌宠', 'Send to pet'), { size: 'sm' });
    const resCopySeed = ctx.ui.copyButton(() => String(resultEntry?.seed ?? ''), { label: t('复制种子', 'Copy seed'), size: 'sm' });
    const resAgain = ctx.ui.button(t('重画', 'Generate again'), { size: 'sm' });
    const resAdjust = ctx.ui.button(t('微调', 'Tweak'), { size: 'sm' });
    resultSheet.body.append(resultImage, resultEmpty, resultCaption, resultActions);
    resultActions.append(resOpen, resPet, resCopySeed, resAgain, resAdjust);
    resultImage.addEventListener('click', () => {
      if (resultImage.src) ctx.ui.lightbox(resultImage.src, resultCaption.textContent ?? '');
    });
    resOpen.addEventListener('click', () => { void ctx.invoke('openFolder').then(() => ctx.ui.toast(t('已请求打开文件夹', 'Opening folder'))).catch((error) => ctx.ui.toast(errText(error), 'bad')); }, { signal: ctx.signal });
    resPet.addEventListener('click', () => {
      if (!resultEntry) return;
      void ctx.invoke<{ ok: boolean; message: string }>('sendToPet', [resultEntry.id])
        .then((res) => ctx.ui.toast(res.message, res.ok ? 'ok' : 'bad'))
        .catch((error) => ctx.ui.toast(errText(error), 'bad'));
    }, { signal: ctx.signal });
    const applyEntry = (entry: HistoryEntry): void => {
      state.positive = entry.positive;
      state.negative = entry.negative;
      state.checkpoint = entry.checkpoint || state.checkpoint;
      state.sampler = entry.sampler;
      state.scheduler = entry.scheduler;
      state.steps = entry.steps;
      state.cfg = entry.cfg;
      state.width = entry.width;
      state.height = entry.height;
      state.batch = entry.batch;
      state.seed = entry.seed;
      positive.value = state.positive;
      negative.value = state.negative;
      setOptions(checkpointSelect, checkpoints, state.checkpoint);
      setOptions(samplerSelect, boot.samplers, state.sampler);
      setOptions(schedulerSelect, boot.schedulers, state.scheduler);
    };

    resAgain.addEventListener('click', () => {
      if (resultEntry) applyEntry(resultEntry);
      state.seed = -1;
      void generate();
    }, { signal: ctx.signal });
    resAdjust.addEventListener('click', () => {
      if (!resultEntry) return;
      applyEntry(resultEntry);
      positive.focus();
      ctx.ui.toast(t('已把这张的参数填回表单，改完再生成。', 'Parameters loaded back into the form.'));
    }, { signal: ctx.signal });

    const showResult = async (entry: HistoryEntry): Promise<void> => {
      try {
        const url = objectUrl(ctx, await ctx.invokeBinary('image', [entry.id]));
        if (!alive) return;
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = url;
        resultImage.src = url;
        resultImage.style.display = 'block';
        resultEmpty.style.display = 'none';
        resultEntry = entry;
        resultCaption.textContent = [
          entry.filename,
          `seed ${entry.seed}`,
          entry.checkpoint,
          ...(entry.loras.length ? [entry.loras.map((lora) => `${lora.name}@${lora.weight}`).join(' + ')] : []),
          shortDate(entry.created_at),
        ].filter(Boolean).join(' · ');
      } catch (error) {
        resultCaption.textContent = errText(error);
        resultCaption.classList.add('bad');
      }
    };

    const showTaskResult = (task: GenerateTaskView): void => {
      if (task.id === resultTaskId) return;
      const entry = history.find((item) => item.id === task.images[0]?.id);
      if (entry) {
        resultTaskId = task.id;
        void showResult(entry);
      }
    };

    /* --------------------------------------------------------------- history */

    const historySheet = ctx.ui.sheet({
      title: t('最近', 'Recent'),
      desc: t(`最近 ${boot.config.history_limit} 张；点缩略图看大图。`, `Last ${boot.config.history_limit}; click a thumbnail for a larger view.`),
    });
    ctx.root.append(historySheet.el);
    const historyGrid = ctx.ui.h('div', 'coo-gen-grid');
    const historyLine = ctx.ui.msgline('');
    const historyUrls: string[] = [];
    historySheet.body.append(historyGrid, historyLine);
    ctx.own({ dispose: () => { for (const url of historyUrls) URL.revokeObjectURL(url); } });

    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
        for (const item of entries) {
          if (!item.isIntersecting) continue;
          const img = item.target as HTMLImageElement;
          observer?.unobserve(img);
          const id = img.dataset.id;
          if (!id || img.dataset.loaded === '1') continue;
          img.dataset.loaded = '1';
          void ctx.invokeBinary('image', [id]).then((blob) => {
            if (!alive) return;
            const url = URL.createObjectURL(blob);
            historyUrls.push(url);
            img.src = url;
          }).catch(() => {
            img.alt = '×';
          });
        }
      }, { rootMargin: '240px' })
      : null;
    if (observer) ctx.own({ dispose: () => observer.disconnect() });

    const renderHistory = (entries: HistoryEntry[]): void => {
      for (const url of historyUrls) URL.revokeObjectURL(url);
      historyUrls.length = 0;
      historyGrid.replaceChildren();
      historyLine.textContent = entries.length
        ? t(`共 ${entries.length} 张 · ${boot.config.output_dir}`, `${entries.length} pictures · ${boot.config.output_dir}`)
        : t('还没有图。', 'No pictures yet.');
      for (const entry of entries) {
        const tile = ctx.ui.h('button', 'coo-gen-tile');
        tile.type = 'button';
        const img = ctx.ui.h('img', 'coo-gen-thumb');
        img.alt = entry.filename;
        img.dataset.id = entry.id;
        img.loading = 'lazy';
        const label = ctx.ui.h('span', 'coo-gen-tile-label', `${entry.seed} · ${entry.width}×${entry.height}`);
        tile.append(img, label);
        tile.addEventListener('click', () => {
          void (async () => {
            try {
              const url = await ctx.invokeBinary('image', [entry.id]).then((blob) => objectUrl(ctx, blob));
              if (alive) ctx.ui.lightbox(url, entry.filename);
            } catch (error) {
              ctx.ui.toast(errText(error), 'bad');
            }
          })();
        }, { signal: ctx.signal });
        historyGrid.append(tile);
        if (observer) observer.observe(img);
        else {
          img.dataset.loaded = '1';
          void ctx.invokeBinary('image', [entry.id]).then((blob) => {
            if (!alive) return;
            const url = URL.createObjectURL(blob);
            historyUrls.push(url);
            img.src = url;
          }).catch(() => {});
        }
      }
    };
    renderHistory(history);

    const refreshHistory = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<HistoryResponse>('history', [Math.max(1, boot.config.history_limit)]);
        if (!alive) return;
        history = res.history;
        renderHistory(history);
        if (res.task) {
          current = res.task;
          renderTask(current);
          if (current.status === 'done' && current.id !== lastFinished) {
            lastFinished = current.id;
            showTaskResult(current);
          }
        }
      } catch { /* 历史刷新失败不阻塞 */ }
    };

    /* --------------------------------------------------------------- actions */

    const afterTask = async (task: GenerateTaskView): Promise<void> => {
      if (task.id === lastFinished) return;
      lastFinished = task.id;
      if (task.status === 'done') {
        await refreshHistory();
        showTaskResult(task);
        say(t('画好了，已经保存。', 'Done and saved.'));
        ctx.ui.toast(t('画好了', 'Done'));
      } else if (task.status === 'error') {
        say(task.error ?? t('出图失败', 'Generation failed'), true);
        ctx.ui.toast(t('出图失败', 'Generation failed'), 'bad');
      } else if (task.status === 'cancelled') {
        say(t('已取消。', 'Cancelled.'));
      }
    };

    const poll = async (): Promise<void> => {
      if (!current || !isActive(current)) return;
      try {
        const res = await ctx.invoke<StatusResponse>('status');
        if (!alive) return;
        current = res.task;
        if (current) {
          renderTask(current);
          if (!isActive(current)) await afterTask(current);
        }
      } catch { /* 下一次再试 */ }
    };
    ctx.interval(() => { void poll(); }, 800);

    async function generate(): Promise<void> {
      if (busy) return;
      if (isActive(current)) {
        say(t('上一张还在画，等它完成或点取消。', 'The previous picture is still running; wait or cancel.'));
        return;
      }
      if (!state.positive.trim()) {
        say(t('先写正向提示词。', 'Write a positive prompt first.'), true);
        positive.focus();
        return;
      }
      busy = true;
      generateBtn.disabled = true;
      say(t('正在提交…', 'Submitting…'));
      try {
        const res = await ctx.invoke<GenerateResponse>('generate', [collect()]);
        if (!alive) return;
        if (!res.ok || !res.task) {
          say(res.error ?? t('提交失败', 'Submit failed'), true);
          return;
        }
        current = res.task;
        lastFinished = '';
        renderTask(current);
        if (res.warnings?.length) say(res.warnings.join('；'), false);
        else say(t('已提交，等待 ComfyUI…', 'Submitted; waiting for ComfyUI…'));
        void refreshHistory();
      } catch (error) {
        say(errText(error), true);
      } finally {
        busy = false;
        generateBtn.disabled = isActive(current);
      }
    }

    generateBtn.addEventListener('click', () => { void generate(); }, { signal: ctx.signal });
    cancelBtn.addEventListener('click', () => {
      if (!current) return;
      void (async () => {
        try {
          await ctx.invoke('cancel', [current?.id]);
          ctx.ui.toast(t('已请求取消', 'Cancel requested'));
          const res = await ctx.invoke<StatusResponse>('status');
          if (!alive) return;
          current = res.task;
          renderTask(current);
        } catch (error) {
          say(errText(error), true);
        }
      })();
    }, { signal: ctx.signal });
    openBtn.addEventListener('click', () => {
      void ctx.invoke('openFolder').then(() => ctx.ui.toast(t('已请求打开文件夹', 'Opening folder'))).catch((error) => ctx.ui.toast(errText(error), 'bad'));
    }, { signal: ctx.signal });

    renderTask(current);
    if (current && isActive(current)) void poll();
    if (current?.status === 'done') showTaskResult(current);

    // 面板挂载时把最新的结果也显示出来。
    if (!resultEntry && history[0]) void showResult(history[0]);
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
      desc: t('扫描 ComfyUI 的 models/loras；设常驻组合、中文别名和触发词。',
        'Scans ComfyUI models/loras; set always-on defaults, aliases and trigger words.'),
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
          }, { signal: ctx.signal });
        }
        const name = document.createElement('div');
        const nameText = document.createElement('div');
        nameText.textContent = record.name;
        const pathText = document.createElement('div');
        pathText.className = 'coo-gen-sub';
        pathText.textContent = `${record.path}${record.category ? ` · ${record.category}` : ''}`;
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
        }, { signal: ctx.signal });
        const aliasBtn = ctx.ui.button(t('别名', 'Aliases'), { size: 'sm' });
        aliasBtn.addEventListener('click', () => openMeta(record, 'aliases'), { signal: ctx.signal });
        const trigBtn = ctx.ui.button(t('触发词', 'Triggers'), { size: 'sm' });
        trigBtn.addEventListener('click', () => openMeta(record, 'trigger_words'), { signal: ctx.signal });
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
      }, { signal: ctx.signal });
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
    categorySelect.addEventListener('change', () => { category = categorySelect.value; render(); }, { signal: ctx.signal });
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
    }, { signal: ctx.signal });

    const defaultSheet = ctx.ui.sheet({
      title: t('常驻组合', 'Always-on stack'),
      desc: t('每次出图都会自动叠加；对话匹配优先，超上限时淘汰常驻。', 'Applied to every generation; chat matches win when the cap is hit.'),
    });
    ctx.root.append(defaultSheet.el);
    const defaultsTable = ctx.ui.table({ head: [t('LoRA', 'LoRA'), t('权重', 'Weight'), ''] });
    defaultSheet.body.append(defaultsTable.el);

    const renderDefaults = (): void => {
      defaultsTable.clear(defaults.length ? undefined : t('还没有常驻 LoRA。', 'No always-on LoRA yet.'));
      for (const [index, item] of defaults.entries()) {
        const name = document.createElement('div');
        name.textContent = item.name;
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
        }, { signal: ctx.signal });
        const remove = ctx.ui.button(t('移除', 'Remove'), { size: 'sm', variant: 'plain' });
        remove.addEventListener('click', () => {
          defaults.splice(index, 1);
          void saveDefaults();
        }, { signal: ctx.signal });
        defaultsTable.addRow([name, weight, remove]);
      }
    };
    renderDefaults();

    const aliasSheet = ctx.ui.sheet({
      title: t('别名表', 'Alias table'),
      desc: t('“塞尔达” → zelda_botw_style；对话里出现中文别名就会匹配。', '“Zelda” → zelda_botw_style; a mention selects the LoRA.'),
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
        }, { signal: ctx.signal });
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
    }, { signal: ctx.signal });
    renderAliases();
    render();

    // 目录路径只用于展示；从 panel 另行读取。
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
          }, { signal: ctx.signal });
          actions.append(isDefault);
        } else {
          const use = ctx.ui.button(t('设为默认', 'Use as default'), { size: 'sm' });
          use.addEventListener('click', () => {
            void (async () => {
              try {
                await ctx.setConfig('world:coo-gen', { 'worlds.coo-gen.defaultWorkflow': preset.id });
                defaultWorkflow = preset.id;
                render();
                ctx.ui.toast(t('已设为默认工作流', 'Default workflow saved'));
              } catch (error) {
                ctx.ui.toast(errText(error), 'bad');
              }
            })();
          }, { signal: ctx.signal });
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
        }, { signal: ctx.signal });
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
          }, { signal: ctx.signal });
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
    }, { signal: ctx.signal });
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
    }, { signal: ctx.signal });
  },
};

const bundle: WebUiClientBundle = {
  panels: {
    studio: studioPanel,
    loras: lorasPanel,
    workflows: workflowsPanel,
  },
};

export default bundle;
