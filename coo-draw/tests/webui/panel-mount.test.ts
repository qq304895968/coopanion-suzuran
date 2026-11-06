import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '../..');

class FakeClassList {
  private readonly set = new Set<string>();
  constructor(private readonly owner: FakeElement) {}
  syncFrom(raw: string): void {
    this.set.clear();
    for (const token of raw.split(/\s+/).filter(Boolean)) this.set.add(token);
  }
  private flush(): void {
    this.owner._className = [...this.set].join(' ');
  }
  add(...tokens: string[]): void {
    for (const token of tokens) if (token) this.set.add(token);
    this.flush();
  }
  remove(...tokens: string[]): void {
    for (const token of tokens) this.set.delete(token);
    this.flush();
  }
  contains(token: string): boolean {
    return this.set.has(token);
  }
  toggle(token: string, force?: boolean): boolean {
    const next = force !== undefined ? force : !this.set.has(token);
    if (next) this.set.add(token);
    else this.set.delete(token);
    this.flush();
    return next;
  }
}

class FakeElement {
  readonly tagName: string;
  _className = '';
  readonly classList: FakeClassList;
  readonly style: Record<string, string> = {};
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  ownerDocument: FakeDocument;
  hidden = false;
  disabled = false;
  checked = false;
  draggable = false;
  value = '';
  type = '';
  name = '';
  placeholder = '';
  inputMode = '';
  title = '';
  alt = '';
  src = '';
  href = '';
  target = '';
  rel = '';
  loading = '';
  min = '';
  max = '';
  step = '';
  rows = 2;
  tabIndex = 0;
  private _text = '';
  private _innerHTML = '';
  private readonly listeners = new Map<string, Array<(ev: any) => void>>();
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(tagName: string, doc: FakeDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = doc;
    this.classList = new FakeClassList(this);
  }

  get className(): string {
    return this._className;
  }
  set className(val: string) {
    this._className = String(val);
    this.classList.syncFrom(this._className);
  }

  get textContent(): string {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(val: string) {
    this.children.splice(0);
    this._text = String(val ?? '');
  }

  get innerHTML(): string {
    return this._innerHTML;
  }
  set innerHTML(val: string) {
    this.children.splice(0);
    this._innerHTML = String(val ?? '');
  }

  get isConnected(): boolean {
    let cur: FakeElement | null = this;
    while (cur) {
      if (cur === this.ownerDocument.body || cur === this.ownerDocument.documentElement) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  setAttribute(k: string, v: string): void {
    this.attributes.set(k, String(v));
    if (k === 'class') this.className = v;
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }
  getAttribute(k: string): string | null {
    return this.attributes.get(k) ?? null;
  }
  removeAttribute(k: string): void {
    this.attributes.delete(k);
  }

  append(...nodes: Array<FakeElement | string>): void {
    for (const node of nodes) {
      const el = typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node;
      el.remove();
      el.parentElement = this;
      this.children.push(el);
    }
  }
  appendChild(node: FakeElement): FakeElement {
    this.append(node);
    return node;
  }
  prepend(...nodes: Array<FakeElement | string>): void {
    const converted = nodes.map((node) => {
      const el = typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node;
      el.remove();
      el.parentElement = this;
      return el;
    });
    this.children.unshift(...converted);
  }
  replaceChildren(...nodes: Array<FakeElement | string>): void {
    for (const child of this.children) child.parentElement = null;
    this.children.splice(0);
    this._text = '';
    this.append(...nodes);
  }
  remove(): void {
    if (!this.parentElement) return;
    const idx = this.parentElement.children.indexOf(this);
    if (idx >= 0) this.parentElement.children.splice(idx, 1);
    this.parentElement = null;
  }
  contains(other: FakeElement | null): boolean {
    let cur: FakeElement | null = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }
  closest(selector: string): FakeElement | null {
    let cur: FakeElement | null = this;
    while (cur) {
      if (matchesSimple(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
    const visit = (node: FakeElement): void => {
      for (const child of node.children) {
        if (parts.some((p) => matchesChain(child, p))) out.push(child);
        visit(child);
      }
    };
    visit(this);
    return out;
  }
  addEventListener(type: string, fn: (ev: any) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, fn: (ev: any) => void): void {
    const list = this.listeners.get(type);
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
  }
  dispatchEvent(ev: any): boolean {
    ev.target ??= this;
    const list = [...(this.listeners.get(ev.type) ?? [])];
    for (const fn of list) fn(ev);
    if (ev.bubbles && !ev._stopped && this.parentElement) {
      this.parentElement.dispatchEvent(ev);
    }
    return true;
  }
  click(): void {
    this.dispatchEvent({
      type: 'click',
      bubbles: true,
      stopPropagation() { this._stopped = true; },
      preventDefault() {},
    });
  }
  focus(): void {
    this.ownerDocument.activeElement = this;
  }
  scrollIntoView(): void {}
  getBoundingClientRect() {
    return { top: 100, bottom: 132, left: 40, right: 240, width: 200, height: 32 };
  }
}

function matchesSimple(el: FakeElement, sel: string): boolean {
  if (!sel) return false;
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const [k, v] = sel.slice(1, -1).split('=');
    const cleanV = v?.replace(/^['"]|['"]$/g, '');
    return cleanV !== undefined ? el.getAttribute(k!) === cleanV : el.getAttribute(k!) !== null;
  }
  const [tag, ...classes] = sel.split('.');
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  return classes.every((c) => el.classList.contains(c));
}

function matchesChain(el: FakeElement, selector: string): boolean {
  const tokens = selector.trim().split(/\s+/);
  if (tokens.length === 1) return matchesSimple(el, tokens[0]!);
  if (!matchesSimple(el, tokens.at(-1)!)) return false;
  let cur = el.parentElement;
  let idx = tokens.length - 2;
  while (cur && idx >= 0) {
    if (tokens[idx] === '>') {
      idx -= 1;
      if (!matchesSimple(cur, tokens[idx]!)) return false;
      idx -= 1;
    } else if (matchesSimple(cur, tokens[idx]!)) {
      idx -= 1;
    }
    cur = cur.parentElement;
  }
  return idx < 0;
}

class FakeDocument {
  readonly documentElement: FakeElement;
  readonly body: FakeElement;
  activeElement: FakeElement | null = null;
  defaultView: any = null;
  private readonly listeners = new Map<string, Array<(ev: any) => void>>();

  constructor() {
    this.documentElement = new FakeElement('html', this);
    (this.documentElement as any).clientWidth = 1280;
    (this.documentElement as any).clientHeight = 800;
    this.body = new FakeElement('body', this);
    this.documentElement.append(this.body);
  }
  createElement(tag: string): FakeElement {
    return new FakeElement(tag, this);
  }
  createElementNS(_ns: string, tag: string): FakeElement {
    return new FakeElement(tag, this);
  }
  createTextNode(text: string): FakeElement {
    const node = new FakeElement('#text', this);
    node.textContent = text;
    return node;
  }
  addEventListener(type: string, fn: (ev: any) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, fn: (ev: any) => void): void {
    const list = this.listeners.get(type);
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
  }
}

function installFakeDom() {
  const doc = new FakeDocument();
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    document: doc,
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  doc.defaultView = win;
  (globalThis as any).document = doc;
  (globalThis as any).window = win;
  (globalThis as any).localStorage = localStorage;
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    bubbles: boolean;
    constructor(type: string, init?: { detail?: any; bubbles?: boolean }) {
      this.type = type;
      this.detail = init?.detail;
      this.bubbles = Boolean(init?.bubbles);
    }
  };
  URL.createObjectURL ??= () => 'blob:fake';
  URL.revokeObjectURL ??= () => {};
  return { doc, store };
}

function createFakeUi(doc: FakeDocument) {
  const h = (tag: string, cls = '', text?: string) => {
    const el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  return {
    h,
    sheet(opts: { title?: string; desc?: string }) {
      const el = h('section', 'sheet');
      if (opts.title) el.append(h('h3', '', opts.title));
      const body = h('div', 'sheet-body');
      el.append(body);
      return { el, body };
    },
    section(title: string, desc?: string) {
      const el = h('div', 'section');
      el.append(h('div', '', title));
      if (desc) el.append(h('div', '', desc));
      return el;
    },
    rowbar() {
      return h('div', 'rowbar');
    },
    msgline(text: string, bad = false) {
      return h('div', bad ? 'msgline bad' : 'msgline', text);
    },
    placeholder(text: string) {
      return h('div', 'placeholder', text);
    },
    field(label: string, control: FakeElement) {
      const wrap = h('div', 'field');
      wrap.append(h('label', '', label), control);
      return wrap;
    },
    input(opts: { type?: string; value?: string; placeholder?: string; cls?: string } = {}) {
      const el = h('input', ['field', opts.cls ?? ''].filter(Boolean).join(' '));
      el.type = opts.type ?? 'text';
      el.value = opts.value ?? '';
      el.placeholder = opts.placeholder ?? '';
      return el;
    },
    textarea(opts: { value?: string; rows?: number; placeholder?: string; onInput?: (v: string) => void } = {}) {
      const el = h('textarea', 'field');
      el.value = opts.value ?? '';
      el.rows = opts.rows ?? 3;
      el.placeholder = opts.placeholder ?? '';
      if (opts.onInput) el.addEventListener('input', () => opts.onInput!(el.value));
      return el;
    },
    button(label: string, opts: { size?: string; variant?: string; onClick?: () => void } = {}) {
      const cls = ['btn', opts.variant ?? '', opts.size ?? ''].filter(Boolean).join(' ');
      const btn = h('button', cls, label);
      btn.type = 'button';
      if (opts.onClick) btn.addEventListener('click', opts.onClick);
      return btn;
    },
    copyButton(_getText: () => string, opts: { label?: string; size?: string } = {}) {
      return h('button', `btn ${opts.size ?? ''}`.trim(), opts.label ?? 'Copy');
    },
    segmented(items: Array<{ value: string; label: string }>, opts: { value?: string; onSelect?: (v: string) => void }) {
      const el = h('div', 'segmented');
      for (const item of items) {
        const b = h('button', 'seg-btn', item.label);
        b.dataset.value = item.value;
        b.addEventListener('click', () => opts.onSelect?.(item.value));
        el.append(b);
      }
      return {
        el,
        setValue(val: string) {
          el.dataset.value = val;
        },
      };
    },
    table(opts: { head: string[]; maxHeight?: string }) {
      const el = h('table', 'data');
      const tbody = h('tbody');
      el.append(tbody);
      void opts.head;
      return {
        el,
        clear(emptyText?: string) {
          tbody.replaceChildren();
          if (emptyText) tbody.append(h('tr', '', emptyText));
        },
        addRow(cells: Array<FakeElement | string>) {
          const tr = h('tr');
          for (const cell of cells) {
            const td = h('td');
            td.append(cell);
            tr.append(td);
          }
          tbody.append(tr);
        },
      };
    },
    toast() {},
    busy() {
      return { dispose() {} };
    },
    confirm: async () => true,
    drawer(_title: string, _body: FakeElement) {
      return { dispose() {} };
    },
    lightbox() {},
  };
}

function makeBootstrap(checkpoints: string[] = []) {
  return {
    health: { ok: true, url: 'http://127.0.0.1:8188', system: 'PyTorch', version: '0.3.0', devices: ['RTX 4090'], checked_at: Date.now() },
    launch: { configured: false, command: '', stop_configured: false, stop_command: '', running: false },
    config: {
      url: 'http://127.0.0.1:8188',
      models_dir: 'D:\\develop\\ComfyUI\\models',
      model_root: 'D:\\develop\\ComfyUI\\models',
      output_dir: 'D:\\develop\\output',
      default_checkpoint: checkpoints[0] ?? '',
      lora_max_count: 5,
      history_limit: 50,
      sampler: 'euler',
      scheduler: 'normal',
      steps: 28,
      cfg: 7,
      width: 768,
      height: 1152,
      batch: 1,
      negative_prompt: 'lowres',
      translate_to_english: true,
    },
    checkpoints,
    diffusion_models: [],
    model_files: [],
    model_root: 'D:\\develop\\ComfyUI\\models',
    samplers: ['euler', 'dpmpp_2m'],
    schedulers: ['normal', 'karras'],
    control_nets: [],
    loras: [
      { name: 'suzuran.safetensors', path: '角色/suzuran.safetensors', category: '角色', aliases: ['铃兰'], trigger_words: ['suzuran'], weight: 0.8, preview: false },
      { name: 'flat_line.safetensors', path: 'flat_line.safetensors', category: '', aliases: [], trigger_words: [], weight: 0.75, preview: false },
    ],
    lora_root: 'D:\\develop\\ComfyUI\\models\\loras',
    defaults: [],
    aliases: { 铃兰: ['角色/suzuran.safetensors'] },
    history: [
      {
        id: 'img-1',
        filename: 'suzuran_0001.png',
        path: 'D:\\develop\\output\\suzuran_0001.png',
        created_at: Date.now(),
        positive: 'suzuran',
        negative: 'lowres',
        checkpoint: 'sdxl.safetensors',
        text_encoder: 'clip_g.safetensors',
        vae: 'sdxl_vae.safetensors',
        loras: [{ name: 'suzuran.safetensors', path: '角色/suzuran.safetensors', weight: 0.8 }],
        sampler: 'euler',
        scheduler: 'normal',
        steps: 28,
        cfg: 7,
        width: 768,
        height: 1152,
        seed: 42,
      },
    ],
    task: null,
    presets: [
      { id: 'quick-txt2img', name: '快速文生图', builtin: true, kind: 'txt2img', needs_checkpoint: true, mapping_count: 10 },
      { id: 'quick-controlnet', name: 'ControlNet', builtin: true, kind: 'controlnet', needs_checkpoint: true, mapping_count: 12 },
      { id: 'imported-krea2', name: 'Krea2二次元图片（导入）', builtin: false, kind: 'imported', needs_checkpoint: false, mapping_count: 8 },
      { id: 'imported-sdxl', name: 'SDXL流程（导入）', builtin: false, kind: 'imported', needs_checkpoint: true, mapping_count: 10 },
      { id: 'lora-only', name: '纯 LoRA 流程', builtin: false, kind: 'custom', needs_checkpoint: false, mapping_count: 4 },
    ],
    workflow: 'quick-txt2img',
  };
}

describe('画室面板真实挂载与交互验证（防 TDZ 与运行时崩溃）', () => {
  it('编译产物中 api 与 local（出图 / 作品 / LoRA 管理 / 工作流）全部正常挂载与切换', async () => {
    const built = await build({
      entryPoints: [resolve(PKG_ROOT, 'src/webui/client.ts')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      write: false,
      outdir: resolve(PKG_ROOT, '.tmp-test'),
      loader: { '.css': 'empty' },
    });
    const jsFile = built.outputFiles.find((f) => f.path.endsWith('.js'))!;
    const mod = await import(`data:text/javascript;base64,${Buffer.from(jsFile.text).toString('base64')}`);
    const bundle = mod.default;

    for (const checkpoints of [[], ['sdxl_base.safetensors']]) {
      const { doc } = installFakeDom();
      const disposables: Array<{ dispose(): void }> = [];
      const controller = new AbortController();
      const boot = makeBootstrap(checkpoints);

      const generatedPayloads: Array<Record<string, any>> = [];
      let savedLastParams: Record<string, any> | undefined;

      const makeCtx = (panelId: string) => {
        const root = doc.createElement('div');
        doc.body.append(root);
        return {
          pageId: 'world:draw',
          panelId,
          language: 'zh',
          root,
          signal: controller.signal,
          ui: createFakeUi(doc),
          memo: { get: () => undefined, set: () => {}, delete: () => {} },
          scope: {},
          own: <T extends { dispose(): void }>(d: T) => { disposables.push(d); return d; },
          interval: () => ({ dispose() {} }),
          timeout: () => ({ dispose() {} }),
          frame: () => ({ dispose() {} }),
          guardLeave: () => ({ dispose() {} }),
          mountSlot: async () => ({ dispose() {} }),
          refresh: async () => {},
          pickPath: async () => null,
          setConfig: async () => '已保存',
          stream: () => ({ close() {} }),
          invokeBinary: async () => new Blob([new Uint8Array([137, 80, 78, 71])]),
          invoke: async (method: string, args?: unknown[]) => {
            if (method === 'info') {
              return { path: 'D:\\draw', fallback: false, total: 2, counts: { favorite: 1, unrated: 1 } };
            }
            if (method.endsWith('bootstrap')) return { ...boot, ...(savedLastParams ? { last_params: savedLastParams } : {}) };
            if (method.endsWith('saveLastParams')) {
              savedLastParams = (args?.[0] ?? undefined) as Record<string, any> | undefined;
              return { ok: true, last_params: savedLastParams };
            }
            if (method.endsWith('generate')) {
              const payload = (args?.[0] ?? {}) as Record<string, any>;
              generatedPayloads.push(payload);
              return {
                ok: true,
                task: {
                  id: `task-${generatedPayloads.length}`,
                  prompt_id: `p-${generatedPayloads.length}`,
                  status: 'running',
                  progress: { current: 1, total: payload.steps ?? 20 },
                  params: payload,
                  loras: [],
                  images: [],
                  created_at: Date.now(),
                },
              };
            }
            if (method.endsWith('presets')) return { presets: boot.presets, default_workflow: boot.workflow };
            if (method.endsWith('presetDetail')) return { ok: true, preset: { name: '快速文生图', mapping: [], warnings: [] } };
            if (method.endsWith('listLoras')) return { loras: boot.loras, defaults: boot.defaults, aliases: boot.aliases, lora_root: boot.lora_root };
            if (method.endsWith('history')) return { history: boot.history, task: null };
            if (method.endsWith('setFavorite')) {
              const [favId, favNext] = (args ?? []) as [string, boolean];
              const target = (boot.history as Array<Record<string, any>>).find((h) => h.id === favId);
              if (target) {
                target.is_favorite = favNext;
                if (favNext) target.favorite_at = Date.now();
                else delete target.favorite_at;
              }
              return { ok: true };
            }
            if (method.endsWith('status')) return { task: null };
            if (method.endsWith('health')) return { health: boot.health };
            if (method.endsWith('refreshModels')) {
              return {
                ok: true,
                checkpoints: boot.checkpoints,
                samplers: boot.samplers,
                schedulers: boot.schedulers,
                control_nets: boot.control_nets,
                loras: boot.loras,
                lora_root: boot.lora_root,
                model_root: boot.model_root,
                health: boot.health,
              };
            }
            return { ok: true };
          },
        };
      };

      // 1. 挂载 API 画夹面板
      const apiCtx = makeCtx('api');
      await bundle.panels.api.mount(apiCtx);
      expect(apiCtx.root.textContent).not.toContain('面板加载失败');
      expect(apiCtx.root.textContent).toContain('画夹');

      // 2. 挂载 Local 面板（默认进入 studio 子面板）
      const localCtx = makeCtx('local');
      await bundle.panels.local.mount(localCtx);
      expect(localCtx.root.textContent).not.toContain('面板加载失败');
      expect(localCtx.root.textContent).not.toContain('Panel failed');

      if (checkpoints.length === 0) {
        // 空模型时渲染紧凑警告卡片与反斜杠路径
        const alert = localCtx.root.querySelector('.coo-checkpoint-alert');
        expect(alert).not.toBeNull();
        expect(alert!.textContent).toContain('当前工作流需要 Checkpoint 模型');
        expect(alert!.textContent).toContain('D:\\develop\\ComfyUI\\models\\checkpoints');
      } else {
        expect(localCtx.root.querySelector('.coo-checkpoint-alert')).toBeNull();
      }

      // 验证 LoRA 固定表头卡片与单/双行分类渲染
      const loraCard = localCtx.root.querySelector('.coo-lora-table-card');
      expect(loraCard).not.toBeNull();
      const rows = loraCard!.querySelectorAll('.coo-lora-row');
      expect(rows.length).toBe(2);
      expect(rows[0]!.querySelector('.sub-text')?.textContent).toBe('角色');
      expect(rows[1]!.querySelector('.sub-text')).toBeNull();

      // 验证高级参数面板展开与随机种子按钮点击无报错
      const advToggle = localCtx.root.querySelector('.coo-adv-toggle')!;
      advToggle.click();
      const shuffleBtn = localCtx.root.querySelector('.btn-shuffle')!;
      shuffleBtn.click();

      // 验证自定义下拉点击挂载到 document.body（Portal），切换工作流（含 ControlNet 与纯 LoRA）无报错
      const ddTrigger = localCtx.root.querySelector('.coo-dd-trigger')!;
      ddTrigger.click();
      const portal = doc.body.querySelector('.coo-dd-portal');
      expect(portal).not.toBeNull();
      const cnOpt = portal!.querySelectorAll('.coo-dd-option').find((li) => li.dataset.value === 'quick-controlnet')!;
      cnOpt.click();
      expect(doc.body.querySelector('.coo-dd-portal')).toBeNull();
      expect(localCtx.root.querySelector('.coo-gen-extra')?.textContent).toContain('ControlNet');

      // 再切换到无需 Checkpoint 的导入工作流（如 Krea2），验证提示区显示「当前工作流无需 Checkpoint」且生成按钮可用、提交不带残留 checkpoint
      ddTrigger.click();
      doc.body.querySelector('.coo-dd-portal')!.querySelectorAll('.coo-dd-option').find((li) => li.dataset.value === 'imported-krea2')!.click();
      expect(localCtx.root.textContent).toContain('当前工作流无需 Checkpoint');
      const genBtn = localCtx.root.querySelector('.coo-action-bar')!.querySelector('.primary')!;
      expect(genBtn.disabled).toBe(false);

      // 切换到需要 Checkpoint 的导入工作流（imported-sdxl），验证空模型时正确弹出 Checkpoint 警告卡片且禁用生成
      ddTrigger.click();
      doc.body.querySelector('.coo-dd-portal')!.querySelectorAll('.coo-dd-option').find((li) => li.dataset.value === 'imported-sdxl')!.click();
      if (checkpoints.length === 0) {
        expect(localCtx.root.querySelector('.coo-checkpoint-alert')?.textContent).toContain('当前工作流需要 Checkpoint 模型');
        expect(genBtn.disabled).toBe(true);
      }

      // 再切换到无需 Checkpoint 的自定义工作流，再切回快速文生图
      ddTrigger.click();
      doc.body.querySelector('.coo-dd-portal')!.querySelectorAll('.coo-dd-option').find((li) => li.dataset.value === 'lora-only')!.click();
      expect(localCtx.root.textContent).toContain('当前工作流无需 Checkpoint');
      ddTrigger.click();
      doc.body.querySelector('.coo-dd-portal')!.querySelectorAll('.coo-dd-option').find((li) => li.dataset.value === 'quick-txt2img')!.click();

      // 空模型警告态下点击「刷新列表」触发 applyModelRefresh 无报错
      if (checkpoints.length === 0) {
        const subBtns = localCtx.root.querySelectorAll('.coo-btn-sub');
        expect(subBtns.length).toBe(2);
        subBtns[1]!.click();
        await new Promise((r) => setTimeout(r, 15));
      }

      // 勾选 LoRA 复选框并点击步进器按钮无报错
      const firstCheckbox = loraCard!.querySelector('.coo-checkbox')!;
      firstCheckbox.click();
      const stepBtns = loraCard!.querySelectorAll('.step-btn');
      stepBtns[1]!.click();
      stepBtns[0]!.click();

      // 3. 验证出图页展示最近一张生成的图片，点击该图片后直接跳转到「作品」Tab 页
      const latestCard = localCtx.root.querySelector('.coo-latest-card');
      expect(latestCard).not.toBeNull();
      expect(latestCard!.style.display).toBe('flex');
      const latestThumb = latestCard!.querySelector('.coo-latest-thumb')!;
      latestThumb.click();
      await new Promise((r) => setTimeout(r, 25));
      expect(localCtx.root.querySelector('.coo-works')).not.toBeNull();

      // 验证作品页 LoRA 标签权重完整渲染，且操作区不含「使用全部参数」与「复制种子」
      const opsPanel = localCtx.root.querySelector('.operations-panel')!;
      expect(opsPanel.textContent).not.toContain('使用全部参数');
      expect(opsPanel.textContent).not.toContain('复制种子');
      const loraChip = localCtx.root.querySelector('.coo-lora-chip')!;
      expect(loraChip.querySelector('.lora-name')?.textContent).toBe('suzuran');
      expect(loraChip.querySelectorAll('.weight').map((el) => el.textContent).join('')).toBe('·0.8');

      // 元信息区展示主模型 / 文本编码器 / VAE
      const metaGrid = localCtx.root.querySelector('.coo-meta-grid')!;
      expect(metaGrid.textContent).toContain('主模型');
      expect(metaGrid.textContent).toContain('sdxl');
      expect(metaGrid.textContent).toContain('文本编码器');
      expect(metaGrid.textContent).toContain('clip_g');
      expect(metaGrid.textContent).toContain('VAE');
      expect(metaGrid.textContent).toContain('sdxl_vae');

      // 收藏持久化：点击收藏后按钮变为已收藏，卡片出现星标
      const favBtn = opsPanel.querySelectorAll('.btn-action').find((b) => b.textContent.includes('收藏'))!;
      expect(favBtn.textContent).not.toContain('已收藏');
      favBtn.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(opsPanel.textContent).toContain('已收藏');
      expect(localCtx.root.querySelector('.coo-work-fav')).not.toBeNull();

      // 已收藏筛选：切到已收藏仍可见；取消收藏后切已收藏显示空状态
      const favSegBtns = localCtx.root.querySelectorAll('.seg-btn');
      favSegBtns.find((b) => b.dataset.value === 'favorite')!.click();
      expect(localCtx.root.querySelectorAll('.coo-works-tile').length).toBe(1);
      opsPanel.querySelectorAll('.btn-action').find((b) => b.textContent.includes('已收藏'))!.click();
      await new Promise((r) => setTimeout(r, 15));
      expect(localCtx.root.querySelectorAll('.coo-works-tile').length).toBe(0);
      favSegBtns.find((b) => b.dataset.value === 'all')!.click();
      expect(localCtx.root.querySelectorAll('.coo-works-tile').length).toBe(1);

      // 验证「微调」按钮：跳转出图页、回填全部参数与原种子（42），且不自动触发生成
      const tweakBtn = opsPanel.querySelectorAll('.btn-action').find((b) => b.textContent.includes('微调'))!;
      tweakBtn.click();
      await new Promise((r) => setTimeout(r, 25));
      expect(localCtx.root.querySelector('.coo-draw-left')).not.toBeNull();
      expect(generatedPayloads).toHaveLength(0);
      const textareasAfterTweak = localCtx.root.querySelectorAll('textarea');
      expect(textareasAfterTweak[0]!.value).toBe('suzuran');
      expect(textareasAfterTweak[1]!.value).toBe('lowres');
      expect(localCtx.root.querySelector('.seed-input-group')!.querySelector('input')!.value).toBe('42');

      // 验证「重画」按钮：当存在可用 Checkpoint 时，以完整参数 + 随机种子跳转出图页并自动发起生成
      if (checkpoints.length > 0) {
        const segBtns = localCtx.root.querySelectorAll('.seg-btn');
        segBtns.find((b) => b.dataset.value === 'works')!.click();
        await new Promise((r) => setTimeout(r, 25));
        const opsPanel2 = localCtx.root.querySelector('.operations-panel')!;
        const redrawBtn = opsPanel2.querySelectorAll('.btn-action').find((b) => b.textContent.includes('重画'))!;
        redrawBtn.click();
        await new Promise((r) => setTimeout(r, 35));
        expect(localCtx.root.querySelector('.coo-draw-left')).not.toBeNull();
        expect(generatedPayloads).toHaveLength(1);
        expect(generatedPayloads[0]!.positive).toBe('suzuran');
        expect(generatedPayloads[0]!.negative).toBe('lowres');
        expect(generatedPayloads[0]!.steps).toBe(28);
        expect(generatedPayloads[0]!.loras).toEqual([{ path: '角色/suzuran.safetensors', weight: 0.8, clip_weight: 0.8 }]);
        expect(generatedPayloads[0]!.seed).not.toBe(42);
      }

      // 4. 依次切换到「LoRA 管理」「工作流」「作品」再切回「出图」，全程零报错
      const segButtons = localCtx.root.querySelectorAll('.seg-btn');
      for (const tabValue of ['loras', 'workflows', 'works', 'studio']) {
        const btn = segButtons.find((b) => b.dataset.value === tabValue)!;
        btn.click();
        await new Promise((r) => setTimeout(r, 15));
        expect(localCtx.root.textContent, `tab=${tabValue}`).not.toContain('面板加载失败');
        expect(localCtx.root.textContent, `tab=${tabValue}`).not.toContain('Panel failed');
      }

      controller.abort();
      for (const d of disposables) d.dispose();
    }
  });
});
