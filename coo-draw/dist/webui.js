// src/webui/config-enhance.ts
function enhanceOnce(root) {
  try {
    if (root.dataset.cooEnhanced === "1") return;
    if (!root.querySelector(".tsection")) return;
    root.dataset.cooEnhanced = "1";
    const doc = root.ownerDocument;
    if (!doc.getElementById("coo-configview-runtime-css")) {
      const st = doc.createElement("style");
      st.id = "coo-configview-runtime-css";
      st.textContent = `
.configview-layout{ display:flex; gap:24px; align-items:flex-start; }
.configview-nav{ position:sticky; top:16px; width:200px; flex-shrink:0; border:1px solid #e5e7eb; border-radius:8px; padding:12px 8px; background:#fafafa; max-height:calc(100vh - 32px); overflow:auto; }
.configview-nav a{ display:block; padding:6px 8px; border-radius:6px; color:#374151; text-decoration:none; font-size:13px; }
.configview-nav a.active{ background:#e0e7ff; color:#3730a3; font-weight:600; }
.configview-nav .nav-sub{ padding-left:16px; font-size:12px; color:#6b7280; }
.configview-nav .nav-group{ font-weight:600; margin-top:10px; }
.configview-nav .nav-group:first-child{ margin-top:0; }
.configview-main{ flex:1; min-width:0; }
.configview-h3{ font-size:14px; font-weight:600; color:#1f2937; margin:16px 0 8px 0; padding:6px 0 6px 8px; border-left:3px solid #6366f1; background:#f8fafc; }
`;
      doc.head.appendChild(st);
    }
    if (root.querySelector(".configview-layout")) return;
    const body = root.querySelector(".configview > div, .configview > .configview-main, .configview");
    const inner = root.firstElementChild;
    if (!inner) return;
    const sections = [];
    let cur = null;
    for (const child of Array.from(inner.children)) {
      if (child.classList.contains("tsection")) {
        if (cur) sections.push(cur);
        cur = { titleEl: child, rows: [] };
      } else if (child.classList.contains("tsecdesc")) {
        if (cur) cur.desc = child;
      } else if (child.classList.contains("trow")) {
        if (!cur) {
          cur = { titleEl: doc.createElement("div"), rows: [] };
          cur.titleEl.textContent = "\u672A\u5206\u7EC4";
          cur.titleEl.className = "tsection";
        }
        cur.rows.push(child);
      }
    }
    if (cur) sections.push(cur);
    if (!sections.length) {
      root.dataset.cooEnhanced = "";
      return;
    }
    const layout = doc.createElement("div");
    layout.className = "configview-layout";
    const nav = doc.createElement("nav");
    nav.className = "configview-nav";
    const main = doc.createElement("div");
    main.className = "configview-main";
    const bar = root.querySelector(".actions");
    const allChildren = Array.from(inner.children);
    sections.forEach((sec, idx) => {
      const gid = `coo-cfg-${idx}`;
      sec.titleEl.id = gid;
      const a = doc.createElement("a");
      a.className = "nav-group";
      a.href = `#${gid}`;
      a.textContent = sec.titleEl.textContent?.trim() || `\u5206\u7EC4 ${idx + 1}`;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        sec.titleEl.scrollIntoView({ behavior: "smooth" });
      });
      nav.appendChild(a);
      main.appendChild(sec.titleEl);
      if (sec.desc) main.appendChild(sec.desc);
      sec.rows.forEach((r) => main.appendChild(r));
    });
    layout.append(nav, main);
    root.replaceChildren(layout);
    if (bar) root.appendChild(bar);
    try {
      const obs = new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) {
          const id = en.target.id;
          nav.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
          const hit = nav.querySelector(`a[href="#${id}"]`);
          if (hit) hit.classList.add("active");
        }
      }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
      main.querySelectorAll(".tsection").forEach((el) => obs.observe(el));
    } catch {
    }
  } catch (e) {
    console.error("coo config enhance failed", e);
    root.dataset.cooEnhanced = "";
  }
}
function start() {
  const doc = document;
  const scan = () => {
    doc.querySelectorAll(".configview").forEach(enhanceOnce);
  };
  scan();
  const obs = new MutationObserver(scan);
  obs.observe(doc.documentElement, { childList: true, subtree: true });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}

// src/webui/parts/api-client.ts
function message(error) {
  return error instanceof Error ? error.message : String(error);
}
var folderPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    const doc = ctx.root.ownerDocument;
    const sheet = ctx.ui.sheet({
      title: t("\u753B\u5939", "Drawing folder"),
      desc: t("\u753B\u597D\u7684\u56FE\u6309\u8BC4\u4EF7\u5B58\u5728\u8FD9\u91CC\uFF1B\u4E5F\u53EF\u4EE5\u4ECE\u8FD9\u91CC\u6362\u76EE\u5F55\u3002", "Saved drawings by rating; you can switch the folder here.")
    });
    ctx.root.append(sheet.el);
    const pathLine = ctx.ui.msgline(t("\u6B63\u5728\u8BFB\u53D6\u2026", "Loading\u2026"));
    const countLine = ctx.ui.msgline("");
    const statusLine = ctx.ui.msgline("");
    const row = ctx.ui.rowbar();
    let currentPath = "";
    const frameName = "pet-draw-open-frame";
    const frame = doc.createElement("iframe");
    frame.name = frameName;
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    sheet.body.append(frame);
    const openLink = doc.createElement("a");
    openLink.className = "btn primary";
    openLink.textContent = t("\u6253\u5F00\u5F53\u524D\u6587\u4EF6\u5939", "Open folder");
    openLink.href = "/api/webui/providers/world:draw/panels/api/open";
    openLink.target = frameName;
    openLink.rel = "noopener";
    openLink.addEventListener("click", () => {
      statusLine.classList.remove("bad");
      statusLine.textContent = t("\u5DF2\u8BF7\u6C42\u6253\u5F00\uFF1B\u5982\u679C\u6CA1\u51FA\u73B0\u7A97\u53E3\uFF0C\u70B9\u201C\u590D\u5236\u8DEF\u5F84\u201D\u5230\u8D44\u6E90\u7BA1\u7406\u5668\u91CC\u6253\u5F00\u3002", "Opening\u2026 if nothing appears, use \u201CCopy path\u201D.");
    });
    const choose = async () => {
      try {
        const picked = await ctx.pickPath({ kind: "directory" });
        if (!picked) return;
        const result = await ctx.setConfig("world:draw", { "worlds.draw.saveDir": picked });
        ctx.ui.toast(result || t("\u5DF2\u4FDD\u5B58", "Saved"));
        await load();
      } catch (error) {
        statusLine.classList.add("bad");
        statusLine.textContent = message(error);
      }
    };
    const chooseButton = ctx.ui.button(t("\u9009\u62E9\u6587\u4EF6\u5939", "Choose folder"), {
      onClick: () => {
        void choose();
      }
    });
    const copyButton = ctx.ui.copyButton(() => currentPath, {
      label: t("\u590D\u5236\u8DEF\u5F84", "Copy path"),
      size: "sm",
      okText: t("\u8DEF\u5F84\u5DF2\u590D\u5236", "Path copied")
    });
    const refreshButton = ctx.ui.button(t("\u5237\u65B0", "Refresh"), {
      size: "sm",
      onClick: () => {
        void load();
      }
    });
    if (typeof ctx.pickPath !== "function") chooseButton.disabled = true;
    row.append(openLink, chooseButton, copyButton, refreshButton);
    sheet.body.append(pathLine, countLine, row, statusLine);
    const setError = (text) => {
      pathLine.textContent = text;
      pathLine.classList.add("bad");
    };
    const load = async () => {
      try {
        const info = await ctx.invoke("info");
        if (info.error) {
          setError(info.error);
          return;
        }
        currentPath = info.path;
        pathLine.classList.remove("bad");
        pathLine.textContent = info.fallback ? t(`\u5F53\u524D\uFF1A${info.path}\uFF08\u9ED8\u8BA4\u4F4D\u7F6E\uFF09`, `Current: ${info.path} (default)`) : t(`\u5F53\u524D\uFF1A${info.path}`, `Current: ${info.path}`);
        countLine.textContent = t(
          `\u5171 ${info.total} \u5F20 \xB7 \u672A\u8BC4 ${info.counts.unrated ?? 0} \xB7 \u6700\u559C\u6B22 ${info.counts.favorite ?? 0} \xB7 \u559C\u6B22 ${info.counts.like ?? 0} \xB7 \u4E00\u822C ${info.counts.neutral ?? 0} \xB7 \u4E0D\u559C\u6B22 ${info.counts.dislike ?? 0}`,
          `${info.total} saved \xB7 unrated ${info.counts.unrated ?? 0} \xB7 favorite ${info.counts.favorite ?? 0} \xB7 like ${info.counts.like ?? 0} \xB7 neutral ${info.counts.neutral ?? 0} \xB7 dislike ${info.counts.dislike ?? 0}`
        );
      } catch (error) {
        setError(message(error));
      }
    };
    await load();
  }
};

// src/webui/parts/local-client.ts
function errText(error) {
  return error instanceof Error ? error.message : String(error);
}
function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function splitList(text) {
  return text.split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}
function setOptions(select, values, selected) {
  select.replaceChildren();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  if (selected && !values.includes(selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = selected;
    select.append(option);
  }
  if (selected) select.value = selected;
}
function objectUrl(ctx, blob) {
  const url = URL.createObjectURL(blob);
  ctx.own({ dispose: () => URL.revokeObjectURL(url) });
  return url;
}
function pill(ctx, text, tone) {
  return ctx.ui.pill(text, tone);
}
function shortDate(ts) {
  try {
    return new Date(ts).toLocaleString(void 0, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function stripExt(name) {
  return name.replace(/\.(safetensors|ckpt|pt|pth)$/i, "");
}
function svgIcon(name, size = 16) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("coo-icon");
  svg.style.width = size + "px";
  svg.style.height = size + "px";
  svg.style.verticalAlign = "middle";
  let inner = "";
  if (name === "info") inner = '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 11h1v5h1"/>';
  else if (name === "shuffle") inner = '<path d="M16 3h4v4"/><path d="M16 21h4v-4"/><path d="M8 8l8 8"/><path d="M8 16l8-8"/>';
  else if (name === "swap") inner = '<path d="M7 16V4"/><path d="M7 16l3-3"/><path d="M7 16l-3-3"/><path d="M17 8v12"/><path d="M17 8l3 3"/><path d="M17 8l-3 3"/>';
  else if (name === "chevronRight") inner = '<path d="M9 18l6-6-6-6"/>';
  else if (name === "chevronDown") inner = '<path d="M6 9l6 6 6-6"/>';
  else if (name === "arrowRight") inner = '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>';
  else if (name === "refresh") inner = '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>';
  else if (name === "warn") inner = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 1.71H20.47a2 2 0 0 0 1.71-1.71L13.71 3.86a1 1 0 0 0-1.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
  else if (name === "plug") inner = '<path d="M7 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4"/><path d="M10 11v6"/><path d="M14 11v6"/><rect x="7" y="17" width="10" height="3" rx="1"/>';
  else inner = '<circle cx="12" cy="12" r="9"/>';
  svg.innerHTML = inner;
  return svg;
}
var PARAM_LABELS = { positive: "\u6B63\u5411\u63D0\u793A\u8BCD", negative: "\u53CD\u5411\u63D0\u793A\u8BCD", checkpoint: "\u6A21\u578B", steps: "\u6B65\u6570", cfg: "CFG", seed: "\u79CD\u5B50", sampler: "\u91C7\u6837\u5668", scheduler: "\u8C03\u5EA6\u5668", width: "\u5BBD", height: "\u9AD8", batch: "\u6279\u6B21" };
var shared = {
  boot: null,
  checkpoints: [],
  loras: [],
  controlNets: [],
  presets: [],
  history: [],
  current: null,
  lastFinished: "",
  resultEntry: null,
  resultUrl: ""
};
var SIZE_PRESETS = [
  { value: "512x512", labelZh: "512\xD7512", labelEn: "512\xD7512", w: 512, h: 512 },
  { value: "768x768", labelZh: "768\xD7768", labelEn: "768\xD7768", w: 768, h: 768 },
  { value: "1024x1024", labelZh: "1024\xD71024", labelEn: "1024\xD71024", w: 1024, h: 1024 },
  { value: "768x1152", labelZh: "768\xD71152", labelEn: "768\xD71152", w: 768, h: 1152 },
  { value: "1152x768", labelZh: "1152\xD7768", labelEn: "1152\xD7768", w: 1152, h: 768 },
  { value: "832x1216", labelZh: "832\xD71216", labelEn: "832\xD71216", w: 832, h: 1216 },
  { value: "1216x832", labelZh: "1216\xD7832", labelEn: "1216\xD7832", w: 1216, h: 832 },
  { value: "custom", labelZh: "\u81EA\u5B9A\u4E49", labelEn: "Custom", w: 0, h: 0 }
];
var studioPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    let alive = true;
    ctx.own({ dispose: () => {
      alive = false;
    } });
    let boot;
    try {
      boot = await ctx.invoke("bootstrap");
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t("\u51FA\u56FE", "Studio") });
      sheet.body.append(ctx.ui.msgline(t("\u8BFB\u53D6\u5931\u8D25\uFF1A", "Failed: ") + errText(error), true));
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
      positive: "",
      negative: boot.config.negative_prompt,
      checkpoint: boot.config.default_checkpoint || boot.checkpoints[0] || "",
      sampler: boot.config.sampler,
      scheduler: boot.config.scheduler,
      steps: boot.config.steps,
      cfg: boot.config.cfg,
      width: boot.config.width,
      height: boot.config.height,
      batch: boot.config.batch,
      seed: -1,
      inputImage: "",
      controlImage: "",
      controlNet: "",
      denoise: void 0,
      controlStrength: void 0,
      loras: /* @__PURE__ */ new Map(),
      custom: {},
      sizePreset: "768x1152"
    };
    {
      const match = SIZE_PRESETS.find((p) => p.w === state.width && p.h === state.height);
      state.sizePreset = match ? match.value : "custom";
    }
    for (const lora of boot.defaults) state.loras.set(lora.path, lora.weight);
    let loras = boot.loras;
    let checkpoints = boot.checkpoints;
    let controlNets = boot.control_nets ?? [];
    let presets = boot.presets;
    let history = shared.history;
    let current = shared.current;
    let lastFinished = shared.lastFinished;
    let resultEntry = shared.resultEntry;
    let resultUrl = shared.resultUrl;
    let busy = false;
    const left = ctx.ui.h("div", "coo-draw-left");
    const right = ctx.ui.h("div", "coo-draw-right");
    const pageWrap = ctx.ui.h("div", "coo-page-wrap");
    const pageContent = ctx.ui.h("div", "coo-page-content");
    pageWrap.append(pageContent);
    pageContent.append(left, right);
    ctx.root.append(pageWrap);
    const paramSheet = { el: left, body: left };
    const workflowRow = ctx.ui.rowbar();
    const workflowSelect = ctx.ui.select({
      options: presets.map((item) => ({
        value: item.id,
        label: `${item.name}${item.builtin ? "" : t("\uFF08\u5BFC\u5165\uFF09", " (imported)")}`
      }))
    });
    workflowSelect.value = state.workflow;
    workflowRow.append(ctx.ui.field(t("\u5DE5\u4F5C\u6D41", "Workflow"), workflowSelect));
    const infoBtn = document.createElement("button");
    infoBtn.className = "coo-info-btn";
    infoBtn.title = t("\u67E5\u770B\u53C2\u6570\u6620\u5C04", "View param mapping");
    infoBtn.append(svgIcon("info", 16));
    infoBtn.style.display = "inline-flex";
    infoBtn.style.alignItems = "center";
    infoBtn.style.justifyContent = "center";
    infoBtn.addEventListener("click", async () => {
      try {
        const res = await ctx.invoke("presetDetail", [state.workflow]);
        if (!res.ok || !res.preset) throw new Error(res.error ?? "\u8BFB\u53D6\u5931\u8D25");
        const body = document.createElement("div");
        const intro = ctx.ui.msgline(t(`\u5F53\u524D\u5DE5\u4F5C\u6D41\u652F\u6301\u901A\u8FC7\u753B\u5BA4\u8C03\u6574\u4EE5\u4E0B ${res.preset.mapping.length} \u4E2A\u53C2\u6570`, `This workflow exposes ${res.preset.mapping.length} adjustable parameters`));
        body.append(intro);
        const tbl = ctx.ui.table({ head: [t("\u53C2\u6570", "Param"), t("\u7C7B\u578B", "Type")] });
        for (const m of res.preset.mapping) {
          const label = PARAM_LABELS[m.param] || m.param;
          tbl.addRow([label, m.ui_type]);
        }
        body.append(tbl.el);
        ctx.ui.drawer(res.preset.name, body);
      } catch (e) {
        ctx.ui.toast(errText(e), "bad");
      }
    });
    workflowRow.append(infoBtn);
    paramSheet.body.append(workflowRow);
    const makeCounter = (ta, limit = 500) => {
      const wrap = ctx.ui.h("div", "coo-prompt-wrap");
      const counter = ctx.ui.h("div", "coo-prompt-counter", "0 / 500");
      const update = () => {
        const len = ta.value.length;
        counter.textContent = `${len} / ${limit}`;
        counter.classList.toggle("warn", len > limit * 0.8 && len <= limit);
        counter.classList.toggle("over", len > limit);
      };
      ta.addEventListener("input", update);
      update();
      wrap.append(ta, counter);
      return wrap;
    };
    const positive = ctx.ui.textarea({
      value: "",
      rows: 4,
      placeholder: t("\u60F3\u753B\u4EC0\u4E48\uFF1F\u4F8B\u5982\uFF1A\u585E\u5C14\u8FBE\u7AD9\u5728\u6D77\u8FB9\u770B\u65E5\u843D\uFF0C\u91D1\u8272\u65F6\u523B\uFF0C\u7535\u5F71\u611F", "What should it be? e.g. Zelda watching sunset by sea, golden hour, cinematic"),
      onInput: (v) => {
        state.positive = v;
      }
    });
    positive.style.width = "100%";
    const posWrap = makeCounter(positive, 500);
    paramSheet.body.append(ctx.ui.field(t("\u6B63\u5411\u63D0\u793A\u8BCD", "Positive prompt"), posWrap));
    const negative = ctx.ui.textarea({
      value: state.negative,
      rows: 2,
      onInput: (v) => {
        state.negative = v;
      }
    });
    negative.style.width = "100%";
    const negWrap = makeCounter(negative, 500);
    paramSheet.body.append(ctx.ui.field(t("\u53CD\u5411\u63D0\u793A\u8BCD", "Negative prompt"), negWrap));
    const checkpointWrap = ctx.ui.h("div", "");
    const checkpointLabel = ctx.ui.h("div", "coo-group-title", t("\u6A21\u578B Checkpoint", "Checkpoint"));
    checkpointWrap.append(checkpointLabel);
    const checkpointSelect = document.createElement("select");
    checkpointSelect.className = "select";
    checkpointSelect.style.width = "100%";
    const checkpointEmpty = ctx.ui.h("div", "coo-empty-card");
    checkpointEmpty.style.display = "none";
    checkpointWrap.append(checkpointSelect, checkpointEmpty);
    paramSheet.body.append(checkpointWrap);
    const renderCheckpointEmpty = () => {
      const needsCheckpoint = (() => {
        const preset = presets.find((p) => p.id === state.workflow);
        if (preset?.kind && preset.kind !== "txt2img" && preset.kind !== "img2img" && preset.kind !== "controlnet") return false;
        return true;
      })();
      if (!needsCheckpoint) {
        checkpointSelect.style.display = "none";
        checkpointEmpty.style.display = "block";
        checkpointEmpty.className = "coo-empty-card coo-empty-card--neutral";
        checkpointEmpty.replaceChildren();
        const tt = ctx.ui.h("div", "title", t("\u5F53\u524D\u5DE5\u4F5C\u6D41\u65E0\u9700 Checkpoint", "This workflow does not require a checkpoint"));
        tt.prepend(svgIcon("info", 14));
        tt.style.display = "inline-flex";
        tt.style.alignItems = "center";
        tt.style.gap = "6px";
        const sub = ctx.ui.msgline(t("\u5DF2\u6309\u5DE5\u4F5C\u6D41\u81EA\u52A8\u9690\u85CF\u6A21\u578B\u9009\u62E9\u3002", "Checkpoint selection hidden for this workflow."));
        checkpointEmpty.append(tt, sub);
        return;
      }
      if (!checkpoints.length) {
        checkpointSelect.style.display = "none";
        checkpointEmpty.style.display = "block";
        checkpointEmpty.className = "coo-empty-card coo-empty-card--warn";
        checkpointEmpty.replaceChildren();
        const warn = ctx.ui.h("div", "title", t("\u672A\u68C0\u6D4B\u5230 Checkpoint \u6A21\u578B", "No checkpoint found"));
        warn.prepend(svgIcon("warn", 14));
        warn.style.display = "inline-flex";
        warn.style.alignItems = "center";
        warn.style.gap = "6px";
        const msg = ctx.ui.msgline(t(
          `\u5F53\u524D\u5DE5\u4F5C\u6D41\u300C${presets.find((p) => p.id === state.workflow)?.name ?? state.workflow}\u300D\u53EF\u80FD\u9700\u8981\u4E00\u4E2A Checkpoint \u6A21\u578B\u624D\u80FD\u6B63\u5E38\u51FA\u56FE\u3002`,
          `Workflow \u201C${presets.find((p) => p.id === state.workflow)?.name ?? state.workflow}\u201D may need a checkpoint.`
        ));
        const paths = ctx.ui.msgline(t(`\u8BF7\u5C06\u6A21\u578B\u6587\u4EF6\u653E\u5165\uFF1A${boot.model_root || boot.config.model_root || boot.config.models_dir || "ComfyUI/models/checkpoints"}`, `Put model files into: ${boot.model_root || boot.config.model_root || boot.config.models_dir || "ComfyUI/models/checkpoints"}`));
        const actions = ctx.ui.rowbar();
        const openDir = ctx.ui.button(t("\u6253\u5F00\u6A21\u578B\u76EE\u5F55", "Open model folder"), { size: "sm" });
        openDir.addEventListener("click", () => {
          void ctx.invoke("openFolder").catch(() => ctx.ui.toast(t("\u8BF7\u5728\u914D\u7F6E\u91CC\u67E5\u770B\u6A21\u578B\u76EE\u5F55\u8DEF\u5F84", "Check model path in settings"), "bad"));
        });
        const refresh = ctx.ui.button(t("\u5237\u65B0\u5217\u8868", "Refresh"), { size: "sm", variant: "primary" });
        refresh.addEventListener("click", () => {
          void doRefreshModels();
        });
        actions.append(openDir, refresh);
        checkpointEmpty.append(warn, msg, paths, actions);
      } else {
        checkpointEmpty.style.display = "none";
        checkpointSelect.style.display = "";
        setOptions(checkpointSelect, checkpoints, state.checkpoint);
        if (!checkpoints.includes(state.checkpoint)) state.checkpoint = checkpoints[0] ?? state.checkpoint;
        checkpointSelect.value = state.checkpoint;
      }
      updateGenerateEnabled();
    };
    checkpointSelect.addEventListener("change", () => {
      state.checkpoint = checkpointSelect.value;
      updateGenerateEnabled();
    });
    renderCheckpointEmpty();
    const loraHeader = ctx.ui.h("div", "coo-lora-header");
    const loraTitle = ctx.ui.h("div", "coo-group-title", t("LoRA \u5217\u8868", "LoRA list"));
    const loraCount = ctx.ui.h("div", "coo-lora-count", "");
    loraHeader.append(loraTitle, loraCount);
    paramSheet.body.append(loraHeader);
    const loraSearch = ctx.ui.input({ type: "search", placeholder: t("\u641C\u7D22 LoRA\uFF08\u540D\u79F0/\u522B\u540D/\u5206\u7C7B/\u89E6\u53D1\u8BCD\uFF09", "Search LoRAs (name/alias/category/trigger)") });
    loraSearch.style.width = "100%";
    paramSheet.body.append(loraSearch);
    const loraToolbar = ctx.ui.h("div", "coo-lora-toolbar");
    const btnAll = ctx.ui.button(t("\u5168\u9009", "Select all"), { size: "sm" });
    const btnInverse = ctx.ui.button(t("\u53CD\u9009", "Invert"), { size: "sm" });
    const btnClear = ctx.ui.button(t("\u6E05\u7A7A", "Clear"), { size: "sm" });
    loraToolbar.append(btnAll, btnInverse, btnClear);
    paramSheet.body.append(loraToolbar);
    const loraTable = ctx.ui.table({ head: ["", t("LoRA", "LoRA"), t("\u6743\u91CD", "Weight")], maxHeight: "360px" });
    loraTable.el.classList.add("coo-lora-list");
    paramSheet.body.append(loraTable.el);
    const renderLoraCount = () => {
      loraCount.textContent = t(`\u5DF2\u9009 ${state.loras.size} \u4E2A`, `${state.loras.size} selected`);
    };
    const renderLoraTable = () => {
      const query = loraSearch.value.trim().toLowerCase();
      const filtered = loras.filter((item) => !query || [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words].some((v) => v.toLowerCase().includes(query)));
      if (!filtered.length) {
        loraTable.clear(t("\u6CA1\u6709\u5339\u914D\u7684 LoRA\uFF0C\u8BD5\u8BD5\u522B\u7684\u5173\u952E\u8BCD", "No matching LoRA, try another keyword"));
        return;
      } else loraTable.clear(void 0);
      for (const record of filtered.slice(0, 300)) {
        const checked = state.loras.has(record.path);
        const box = ctx.ui.checkbox("", {
          checked,
          onChange: (v) => {
            if (v) {
              state.loras.set(record.path, record.weight ?? 0.75);
            } else {
              state.loras.delete(record.path);
            }
            renderLoraTable();
            renderLoraCount();
          }
        });
        box.el.setAttribute("aria-label", record.name);
        const nameCell = document.createElement("div");
        const title = document.createElement("div");
        title.textContent = record.aliases.length ? `${stripExt(record.name)}\uFF08${record.aliases.join("/")}\uFF09` : stripExt(record.name);
        title.title = record.path;
        const sub = document.createElement("div");
        sub.className = "coo-gen-sub";
        const displayPath = stripExt(record.path);
        sub.textContent = [displayPath, record.category || t("\u672A\u5206\u7C7B", "uncategorized"), ...record.trigger_words.length ? [record.trigger_words.slice(0, 4).join("/")] : []].join(" \xB7 ");
        sub.title = record.path;
        nameCell.append(title, sub);
        const weightWrap = ctx.ui.h("div", "coo-weight-stepper");
        const weightInput = ctx.ui.input({
          type: "number",
          value: String(state.loras.get(record.path) ?? record.weight ?? 0.75),
          cls: "mono coo-gen-weight"
        });
        weightInput.min = "-2";
        weightInput.max = "2";
        weightInput.step = "0.05";
        weightInput.disabled = !checked;
        weightInput.title = t("\u53CC\u51FB\u6062\u590D\u9ED8\u8BA4\u503C 0.75", "Double-click to reset to 0.75");
        weightInput.addEventListener("dblclick", () => {
          weightInput.value = "0.75";
          if (state.loras.has(record.path)) state.loras.set(record.path, 0.75);
        });
        weightInput.addEventListener("change", () => {
          const v = Math.min(2, Math.max(-2, num(weightInput.value, 0.75)));
          if (Math.abs(v) > 2) {
            ctx.ui.toast(t("\u6743\u91CD\u8D85\u51FA\u8303\u56F4 -2 ~ 2", "Weight out of range -2 ~ 2"), "bad");
          }
          weightInput.value = String(v);
          if (state.loras.has(record.path)) state.loras.set(record.path, v);
        });
        const dec = document.createElement("button");
        dec.textContent = "\u2212";
        dec.className = "";
        dec.style.cssText = "width:22px;height:22px;border:1px solid var(--line,rgba(127,127,127,.2));border-radius:4px;cursor:pointer;background:rgba(127,127,127,.06)";
        const inc = document.createElement("button");
        inc.textContent = "+";
        inc.style.cssText = "width:22px;height:22px;border:1px solid var(--line,rgba(127,127,127,.2));border-radius:4px;cursor:pointer;background:rgba(127,127,127,.06)";
        dec.addEventListener("click", () => {
          const v = Math.max(-2, num(weightInput.value, 0.75) - 0.05);
          weightInput.value = v.toFixed(2);
          if (state.loras.has(record.path)) state.loras.set(record.path, v);
          persistLora();
        });
        inc.addEventListener("click", () => {
          const v = Math.min(2, num(weightInput.value, 0.75) + 0.05);
          weightInput.value = v.toFixed(2);
          if (state.loras.has(record.path)) state.loras.set(record.path, v);
          persistLora();
        });
        weightWrap.append(dec, weightInput, inc);
        loraTable.addRow([box.el, nameCell, weightWrap]);
      }
      renderLoraCount();
    };
    btnAll.addEventListener("click", () => {
      for (const l of loras) state.loras.set(l.path, l.weight ?? 0.75);
      renderLoraTable();
    });
    btnInverse.addEventListener("click", () => {
      const next = /* @__PURE__ */ new Map();
      for (const l of loras) if (!state.loras.has(l.path)) next.set(l.path, l.weight ?? 0.75);
      state.loras = next;
      renderLoraTable();
    });
    btnClear.addEventListener("click", () => {
      state.loras.clear();
      renderLoraTable();
    });
    const LORA_STORE_KEY = "coo-draw-last-loras";
    const persistLora = () => {
      try {
        localStorage.setItem(LORA_STORE_KEY, JSON.stringify([...state.loras.entries()]));
      } catch {
      }
    };
    const restoreLora = () => {
      try {
        const raw = localStorage.getItem(LORA_STORE_KEY);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return;
        state.loras = new Map(arr.filter(([k, v]) => typeof k === "string" && typeof v === "number" && loras.some((l) => l.path === k)));
      } catch {
      }
    };
    restoreLora();
    const patchEmptyCheck = () => {
      if (loraSearch.value.trim() && !loras.filter((item) => [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words].some((v) => v.toLowerCase().includes(loraSearch.value.trim().toLowerCase()))).length) {
      }
    };
    loraSearch.addEventListener("input", renderLoraTable);
    renderLoraTable();
    const basicGroup = ctx.ui.h("div", "coo-group");
    const basicTitle = ctx.ui.h("div", "coo-group-title", t("\u57FA\u672C\u91C7\u6837", "Sampler"));
    const basicGrid = ctx.ui.h("div", "coo-group-grid");
    const samplerSelect = ctx.ui.select({ options: [] });
    setOptions(samplerSelect, boot.samplers, state.sampler);
    samplerSelect.addEventListener("change", () => {
      state.sampler = samplerSelect.value;
    });
    const schedulerSelect = ctx.ui.select({ options: [] });
    setOptions(schedulerSelect, boot.schedulers, state.scheduler);
    schedulerSelect.addEventListener("change", () => {
      state.scheduler = schedulerSelect.value;
    });
    const stepsInput = ctx.ui.input({ type: "number", value: String(state.steps), cls: "mono" });
    stepsInput.min = "1";
    stepsInput.max = "100";
    stepsInput.step = "1";
    stepsInput.addEventListener("change", () => {
      state.steps = Math.max(1, Math.min(100, Math.round(num(stepsInput.value, state.steps))));
      stepsInput.value = String(state.steps);
      updateProgressMax();
    });
    const cfgInput = ctx.ui.input({ type: "number", value: String(state.cfg), cls: "mono" });
    cfgInput.min = "1";
    cfgInput.max = "30";
    cfgInput.step = "0.5";
    cfgInput.addEventListener("change", () => {
      state.cfg = Math.min(30, Math.max(1, num(cfgInput.value, state.cfg)));
      cfgInput.value = String(state.cfg);
    });
    basicGrid.append(ctx.ui.field(t("\u91C7\u6837\u5668", "Sampler"), samplerSelect), ctx.ui.field(t("\u8C03\u5EA6\u5668", "Scheduler"), schedulerSelect), ctx.ui.field(t("\u6B65\u6570", "Steps"), stepsInput), ctx.ui.field("CFG", cfgInput));
    basicGroup.append(basicTitle, basicGrid);
    paramSheet.body.append(basicGroup);
    const sizeGroup = ctx.ui.h("div", "coo-group");
    const sizeTitle = ctx.ui.h("div", "coo-group-title", t("\u5C3A\u5BF8\u8BBE\u7F6E", "Size"));
    const sizeRow = ctx.ui.h("div", "coo-size-row");
    const sizeSelect = ctx.ui.select({
      options: SIZE_PRESETS.map((p) => ({ value: p.value, label: zh ? p.labelZh : p.labelEn }))
    });
    sizeSelect.value = state.sizePreset;
    const widthInput = ctx.ui.input({ type: "number", value: String(state.width), cls: "mono coo-gen-num" });
    widthInput.min = "64";
    widthInput.max = "4096";
    widthInput.step = "8";
    const heightInput = ctx.ui.input({ type: "number", value: String(state.height), cls: "mono coo-gen-num" });
    heightInput.min = "64";
    heightInput.max = "4096";
    heightInput.step = "8";
    const swapBtn = document.createElement("button");
    swapBtn.className = "btn plain sm coo-swap-btn";
    swapBtn.title = t("\u4EA4\u6362\u5BBD\u9AD8", "Swap width/height");
    swapBtn.append(svgIcon("swap", 16), document.createTextNode(t(" \u4EA4\u6362", " Swap")));
    swapBtn.type = "button";
    sizeRow.append(ctx.ui.field(t("\u5C3A\u5BF8\u9884\u8BBE", "Size preset"), sizeSelect), ctx.ui.field(t("\u5BBD", "Width"), widthInput), ctx.ui.field(t("\u9AD8", "Height"), heightInput), swapBtn);
    sizeRow.classList.add("coo-swap-btn");
    sizeGroup.append(sizeTitle, sizeRow);
    paramSheet.body.append(sizeGroup);
    const advGroup = ctx.ui.h("div", "coo-group");
    const advToggle = document.createElement("button");
    advToggle.className = "coo-adv-toggle";
    advToggle.setAttribute("aria-expanded", "false");
    const advLabel = ctx.ui.h("span", "", t("\u9AD8\u7EA7", "Advanced"));
    advLabel.style.fontWeight = "600";
    const advArrow = svgIcon("chevronRight", 14);
    advArrow.classList.add("coo-adv-arrow");
    advToggle.append(advLabel, advArrow);
    const advBody = ctx.ui.h("div", "coo-adv-body hidden");
    const batchInput = ctx.ui.input({ type: "number", value: String(state.batch), cls: "mono coo-gen-num" });
    batchInput.min = "1";
    batchInput.max = "8";
    batchInput.step = "1";
    batchInput.addEventListener("change", () => {
      state.batch = Math.max(1, Math.min(8, Math.round(num(batchInput.value, state.batch))));
      batchInput.value = String(state.batch);
    });
    const seedInput = ctx.ui.input({ type: "number", value: String(state.seed), cls: "mono coo-gen-num" });
    seedInput.min = "-1";
    seedInput.max = "9007199254740991";
    seedInput.step = "1";
    seedInput.addEventListener("change", () => {
      const v = Math.trunc(num(seedInput.value, state.seed));
      seedInput.value = String(v);
      state.seed = v;
    });
    const seedWrap = ctx.ui.h("div", "coo-seed-wrap");
    seedWrap.style.display = "inline-flex";
    seedWrap.style.alignItems = "center";
    seedWrap.style.gap = "6px";
    const randBtn = document.createElement("button");
    randBtn.className = "coo-seed-rand";
    randBtn.type = "button";
    randBtn.title = t("\u968F\u673A\u751F\u6210\u79CD\u5B50", "Randomize seed");
    randBtn.append(svgIcon("shuffle", 16));
    randBtn.style.width = "32px";
    randBtn.style.height = "32px";
    randBtn.style.display = "inline-flex";
    randBtn.style.alignItems = "center";
    randBtn.style.justifyContent = "center";
    randBtn.style.border = "1px solid var(--line, rgba(127,127,127,.18))";
    randBtn.style.borderRadius = "6px";
    randBtn.style.background = "rgba(127,127,127,.04)";
    randBtn.style.cursor = "pointer";
    randBtn.style.flexShrink = "0";
    randBtn.addEventListener("mouseenter", () => {
      randBtn.style.background = "rgba(127,127,127,.08)";
    });
    randBtn.addEventListener("mouseleave", () => {
      randBtn.style.background = "rgba(127,127,127,.04)";
    });
    randBtn.addEventListener("click", () => {
      const v = Math.floor(Math.random() * 2147483647);
      state.seed = v;
      seedInput.value = String(v);
      randBtn.style.transform = "rotate(180deg)";
      randBtn.style.transition = "transform 180ms";
      setTimeout(() => {
        randBtn.style.transform = "rotate(0deg)";
      }, 200);
    });
    seedWrap.append(seedInput, randBtn);
    const batchField = ctx.ui.field(t("\u6279\u6B21", "Batch"), batchInput);
    const seedField = ctx.ui.field(t("\u79CD\u5B50", "Seed"), seedWrap);
    advBody.append(batchField, seedField);
    advToggle.addEventListener("click", () => {
      const hidden = advBody.classList.toggle("hidden");
      advToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
      advArrow.style.transform = hidden ? "rotate(0deg)" : "rotate(90deg)";
    });
    advGroup.append(advToggle, advBody);
    paramSheet.body.append(advGroup);
    sizeSelect.addEventListener("change", () => {
      const preset = SIZE_PRESETS.find((p) => p.value === sizeSelect.value);
      if (!preset) return;
      state.sizePreset = preset.value;
      if (preset.value !== "custom") {
        state.width = preset.w;
        state.height = preset.h;
        widthInput.value = String(preset.w);
        heightInput.value = String(preset.h);
      }
    });
    const markCustom = () => {
      const match = SIZE_PRESETS.find((p) => p.w === num(widthInput.value, state.width) && p.h === num(heightInput.value, state.height) && p.value !== "custom");
      if (match) {
        state.sizePreset = match.value;
        sizeSelect.value = match.value;
      } else {
        state.sizePreset = "custom";
        sizeSelect.value = "custom";
      }
    };
    widthInput.addEventListener("change", () => {
      state.width = Math.max(64, Math.min(4096, Math.round(num(widthInput.value, state.width) / 8) * 8));
      widthInput.value = String(state.width);
      markCustom();
    });
    heightInput.addEventListener("change", () => {
      state.height = Math.max(64, Math.min(4096, Math.round(num(heightInput.value, state.height) / 8) * 8));
      heightInput.value = String(state.height);
      markCustom();
    });
    swapBtn.addEventListener("click", () => {
      const w = state.width;
      state.width = state.height;
      state.height = w;
      widthInput.value = String(state.width);
      heightInput.value = String(state.height);
      markCustom();
    });
    const extraBox = ctx.ui.h("div", "coo-gen-extra");
    paramSheet.body.append(extraBox);
    const genLine = ctx.ui.msgline("");
    left.append(genLine);
    const actionFloat = ctx.ui.h("div", "coo-action-float");
    const actionHint = ctx.ui.h("div", "hint", "");
    actionHint.style.display = "none";
    const actionRow = ctx.ui.h("div", "coo-action-row");
    const generateBtn = ctx.ui.button(t("\u751F\u6210", "Generate"), { variant: "primary" });
    generateBtn.style.flex = "1.6";
    const cancelBtn = ctx.ui.button(t("\u53D6\u6D88", "Cancel"));
    cancelBtn.disabled = true;
    cancelBtn.style.border = "1px solid var(--line, rgba(127,127,127,.3))";
    cancelBtn.style.display = "inline-flex";
    cancelBtn.style.alignItems = "center";
    cancelBtn.style.justifyContent = "center";
    const openFolderBtn = ctx.ui.button(t("\u6253\u5F00\u76EE\u5F55", "Open folder"), { variant: "plain", size: "sm" });
    openFolderBtn.style.display = "inline-flex";
    openFolderBtn.style.alignItems = "center";
    openFolderBtn.style.justifyContent = "center";
    openFolderBtn.addEventListener("click", () => {
      void ctx.invoke("openFolder").then(() => ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u6253\u5F00\u6587\u4EF6\u5939", "Opening folder"))).catch((e) => ctx.ui.toast(errText(e), "bad"));
    });
    actionRow.append(generateBtn, cancelBtn, openFolderBtn);
    actionFloat.append(actionHint, actionRow);
    const say = (text, bad = false) => {
      genLine.textContent = text;
      genLine.classList.toggle("bad", bad);
      actionHint.textContent = text;
      actionHint.style.display = text ? "block" : "none";
    };
    const isActive = (task) => !!task && (task.status === "queued" || task.status === "running");
    const updateGenerateEnabled = () => {
      const needsCkpt = checkpoints.length === 0 && !(presets.find((p) => p.id === state.workflow)?.warnings?.join("") ?? "").includes("\u65E0\u9700");
      const missingCkpt = checkpoints.length === 0;
      const mustHave = checkpoints.length === 0;
      const notSelected = checkpoints.length > 0 && !state.checkpoint;
      const shouldDisable = (mustHave || notSelected) && !isActive(current);
      const preset = presets.find((p) => p.id === state.workflow);
      const noNeed = preset && (preset.kind === "imported" && checkpoints.length === 0);
      let disable = false;
      let hint = "";
      if (checkpoints.length === 0) {
        const needs = ["quick-txt2img", "quick-img2img", "quick-controlnet"].includes(state.workflow) || (preset?.kind === "txt2img" || preset?.kind === "img2img" || preset?.kind === "controlnet");
        if (needs) {
          disable = true;
          hint = t("\u8BF7\u5148\u9009\u62E9 Checkpoint \u6A21\u578B", "Select a checkpoint first");
        }
      } else if (!state.checkpoint) {
        disable = true;
        hint = t("\u8BF7\u5148\u9009\u62E9 Checkpoint \u6A21\u578B", "Select a checkpoint first");
      }
      generateBtn.disabled = disable || busy || isActive(current);
      if (disable && hint) actionHint.textContent = hint;
      generateBtn.title = disable ? hint : "";
    };
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
      ...state.inputImage ? { inputImage: state.inputImage } : {},
      ...state.controlImage ? { controlImage: state.controlImage } : {},
      ...state.controlNet ? { controlNet: state.controlNet } : {},
      ...state.denoise !== void 0 ? { denoise: state.denoise } : {},
      ...state.controlStrength !== void 0 ? { controlStrength: state.controlStrength } : {},
      ...Object.keys(state.custom).length ? { custom: state.custom } : {}
    });
    const KNOWN_PARAMS = /* @__PURE__ */ new Set(["positive", "negative", "checkpoint", "steps", "cfg", "seed", "sampler", "scheduler", "width", "height", "batch", "inputImage", "controlImage", "controlNet", "denoise", "controlStrength"]);
    async function loadCustomFields() {
      const workflowId = state.workflow;
      try {
        const res = await ctx.invoke("presetDetail", [workflowId]);
        if (!alive || state.workflow !== workflowId || !res.ok || !res.preset) return;
        const custom = res.preset.mapping.filter((item) => !KNOWN_PARAMS.has(item.param));
        if (!custom.length) return;
        const box = ctx.ui.h("div", "coo-gen-extra");
        box.append(ctx.ui.section(t("\u81EA\u5B9A\u4E49\u53C2\u6570", "Custom parameters"), t("\u4ECE\u5BFC\u5165\u5DE5\u4F5C\u6D41\u91CC\u81EA\u52A8\u8BC6\u522B\u7684\u53C2\u6570\u3002", "Auto-detected from imported workflow.")));
        for (const map of custom) {
          const currentVal = state.custom[map.param] ?? (typeof map.default === "number" || typeof map.default === "string" ? map.default : "");
          const control = map.ui_type === "number" || map.ui_type === "slider" || map.ui_type === "seed" ? ctx.ui.input({ type: "number", value: String(currentVal), cls: "mono coo-gen-num" }) : ctx.ui.input({ value: String(currentVal), cls: "mono" });
          control.addEventListener("change", () => {
            if (map.ui_type === "number" || map.ui_type === "slider" || map.ui_type === "seed") state.custom[map.param] = num(control.value, Number(currentVal) || 0);
            else state.custom[map.param] = control.value;
          });
          box.append(ctx.ui.field(`${map.ui_label || map.param} (${map.param})`, control));
        }
        extraBox.append(box);
      } catch {
      }
    }
    const renderExtra = () => {
      extraBox.replaceChildren();
      void loadCustomFields();
      const preset = presets.find((item) => item.id === state.workflow);
      const kind = preset?.kind;
      if (kind !== "img2img" && kind !== "controlnet") return;
      const row = ctx.ui.rowbar();
      const inputPath = ctx.ui.input({ value: state.inputImage, cls: "mono", placeholder: t("\u8F93\u5165\u56FE\u7EDD\u5BF9\u8DEF\u5F84", "Absolute path to input image") });
      inputPath.style.flex = "1";
      inputPath.style.minWidth = "220px";
      const choose = ctx.ui.button(t("\u9009\u62E9\u2026", "Choose\u2026"), { size: "sm" });
      choose.addEventListener("click", () => {
        void (async () => {
          try {
            const picked = await ctx.pickPath({ kind: "file", extensions: ["png", "jpg", "jpeg", "webp"] });
            if (picked) {
              state.inputImage = picked;
              inputPath.value = picked;
            }
          } catch (e) {
            say(errText(e), true);
          }
        })();
      });
      inputPath.addEventListener("change", () => {
        state.inputImage = inputPath.value.trim();
      });
      row.append(ctx.ui.field(t("\u8F93\u5165\u56FE", "Input image"), inputPath), choose);
      extraBox.append(row);
      if (kind === "controlnet") {
        const controlRow = ctx.ui.rowbar();
        const controlPath = ctx.ui.input({ value: state.controlImage, cls: "mono", placeholder: t("\u63A7\u5236\u56FE\u7EDD\u5BF9\u8DEF\u5F84", "Absolute path to control image") });
        controlPath.style.flex = "1";
        controlPath.style.minWidth = "220px";
        const chooseControl = ctx.ui.button(t("\u9009\u62E9\u2026", "Choose\u2026"), { size: "sm" });
        chooseControl.addEventListener("click", () => {
          void (async () => {
            try {
              const picked = await ctx.pickPath({ kind: "file", extensions: ["png", "jpg", "jpeg", "webp"] });
              if (picked) {
                state.controlImage = picked;
                controlPath.value = picked;
              }
            } catch (e) {
              say(errText(e), true);
            }
          })();
        });
        controlPath.addEventListener("change", () => {
          state.controlImage = controlPath.value.trim();
        });
        controlRow.append(ctx.ui.field(t("\u63A7\u5236\u56FE", "Control image"), controlPath), chooseControl);
        const controlNetSelect = ctx.ui.select({ options: controlNets });
        setOptions(controlNetSelect, controlNets, state.controlNet);
        controlNetSelect.addEventListener("change", () => {
          state.controlNet = controlNetSelect.value;
        });
        controlRow.append(ctx.ui.field(t("ControlNet \u6A21\u578B", "ControlNet model"), controlNetSelect));
        extraBox.append(controlRow);
        const strengthRow = ctx.ui.rowbar();
        const strength = ctx.ui.input({ type: "number", value: String(state.controlStrength ?? 1), cls: "mono coo-gen-num" });
        strength.min = "0";
        strength.max = "2";
        strength.step = "0.05";
        strength.addEventListener("change", () => {
          state.controlStrength = Math.min(2, Math.max(0, num(strength.value, 1)));
        });
        strengthRow.append(ctx.ui.field(t("\u63A7\u5236\u5F3A\u5EA6", "Control strength"), strength));
        extraBox.append(strengthRow);
      }
      const denoiseRow = ctx.ui.rowbar();
      const denoise = ctx.ui.input({ type: "number", value: String(state.denoise ?? (kind === "img2img" ? 0.6 : 0.7)), cls: "mono coo-gen-num" });
      denoise.min = "0.05";
      denoise.max = "1";
      denoise.step = "0.05";
      denoise.addEventListener("change", () => {
        state.denoise = Math.min(1, Math.max(0.05, num(denoise.value, 0.6)));
      });
      denoiseRow.append(ctx.ui.field(t("\u91CD\u7ED8\u5E45\u5EA6", "Denoise"), denoise));
      extraBox.append(denoiseRow);
    };
    workflowSelect.addEventListener("change", () => {
      state.workflow = workflowSelect.value;
      state.custom = {};
      renderCheckpointEmpty();
      renderExtra();
      updateGenerateEnabled();
    });
    void presets.find((item) => item.id === state.workflow);
    renderExtra();
    const connCard = ctx.ui.h("div", "coo-conn-card");
    const connHead = ctx.ui.h("div", "coo-conn-head");
    const connTitle = ctx.ui.h("div", "coo-conn-title", t("ComfyUI \u8FDE\u63A5", "ComfyUI Connection"));
    connTitle.prepend(svgIcon("plug", 16));
    const connBadge = ctx.ui.h("span", "pill coo-conn-badge", "");
    const dot = ctx.ui.h("span", "coo-conn-dot " + (boot.health.ok ? "on" : "off"));
    connBadge.append(dot, document.createTextNode(boot.health.ok ? t("\u5728\u7EBF", "Online") : t("\u79BB\u7EBF", "Offline")));
    connBadge.style.background = boot.health.ok ? "rgba(60,180,90,.14)" : "rgba(220,60,60,.12)";
    connHead.append(connTitle, connBadge);
    const connMeta = ctx.ui.h("div", "coo-conn-kv");
    const kvRow = (k, v, action) => {
      const kk = ctx.ui.h("div", "k", k);
      const vv = ctx.ui.h("div", "v");
      if (typeof v === "string") {
        const span = ctx.ui.h("span", "truncate", v);
        span.title = v;
        vv.append(span);
      } else vv.append(v);
      if (action) vv.append(action);
      const wrap = ctx.ui.h("div", "");
      wrap.style.display = "contents";
      wrap.append(kk, vv);
      return wrap;
    };
    const renderConnMeta = () => {
      connMeta.replaceChildren();
      const versionVal = `${boot.health.version ? "v" + boot.health.version : ""} ${boot.health.system ?? ""}`.trim() || "\u2014";
      const deviceRaw = boot.health.devices?.[0] ?? "\u2014";
      const deviceEl = ctx.ui.h("span", "truncate", deviceRaw);
      deviceEl.title = deviceRaw;
      const addrText = ctx.ui.h("span", "truncate", boot.config.url);
      addrText.title = boot.config.url;
      const editBtn = ctx.ui.button(t("\u7F16\u8F91", "Edit"), { size: "sm" });
      editBtn.addEventListener("click", () => {
        urlRow.style.display = urlRow.style.display === "none" ? "flex" : "none";
      });
      const openOut = ctx.ui.button(t("\u6253\u5F00", "Open"), { size: "sm" });
      openOut.addEventListener("click", () => {
        void ctx.invoke("openFolder").then(() => ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u6253\u5F00", "Opening"))).catch((e) => ctx.ui.toast(errText(e), "bad"));
      });
      const outText = ctx.ui.h("span", "truncate", boot.config.output_dir);
      outText.title = boot.config.output_dir;
      connMeta.append(
        kvRow(t("\u72B6\u6001", "Status"), boot.health.ok ? t("\u5728\u7EBF", "Online") : t("\u79BB\u7EBF", "Offline")),
        kvRow(t("\u7248\u672C", "Version"), versionVal),
        kvRow(t("\u8BBE\u5907", "Device"), deviceEl),
        kvRow(t("\u5730\u5740", "URL"), addrText, editBtn),
        kvRow(t("\u6A21\u578B", "Model"), `Checkpoint ${checkpoints.length} \xB7 LoRA ${loras.length}`),
        kvRow(t("\u8F93\u51FA", "Output"), outText, openOut)
      );
    };
    renderConnMeta();
    const urlRow = ctx.ui.h("div", "coo-conn-url-row");
    urlRow.style.display = "none";
    const urlInput = ctx.ui.input({ value: boot.config.url, cls: "mono" });
    const saveUrl = ctx.ui.button(t("\u4FDD\u5B58\u5730\u5740", "Save URL"), { size: "sm" });
    const checkBtn = ctx.ui.button(t("\u68C0\u6D4B", "Check"), { size: "sm" });
    urlRow.append(urlInput, saveUrl, checkBtn);
    const connActions = ctx.ui.h("div", "coo-conn-actions");
    const launchBtn = ctx.ui.button(t("\u4E00\u952E\u542F\u52A8", "Launch"), { size: "sm", variant: "primary" });
    launchBtn.disabled = !boot.launch.configured;
    const stopBtn = ctx.ui.button(t("\u5173\u95ED ComfyUI", "Stop ComfyUI"), { size: "sm", variant: "plain" });
    stopBtn.disabled = !boot.launch.stop_configured;
    stopBtn.style.color = "var(--danger, #c44)";
    const refreshBtn = ctx.ui.button(t("\u5237\u65B0", "Refresh"), { size: "sm" });
    refreshBtn.prepend(svgIcon("refresh", 14));
    connActions.append(launchBtn, refreshBtn, stopBtn);
    if (!boot.launch.configured || !boot.launch.stop_configured) {
      const warn = ctx.ui.msgline(t(!boot.launch.configured ? "\u6CA1\u6709\u914D\u7F6E\u542F\u52A8\u811A\u672C\u3002\u5230 World \u8BBE\u7F6E\u91CC\u586B\u300CComfyUI \u542F\u52A8\u811A\u672C\u300D\u540E\u53EF\u4E00\u952E\u542F\u52A8\u3002" : "\u6CA1\u6709\u914D\u7F6E\u5173\u95ED\u811A\u672C\u3002\u5230 World \u8BBE\u7F6E\u91CC\u586B\u300CComfyUI \u5173\u95ED\u811A\u672C\u300D\u540E\u53EF\u4E00\u952E\u5173\u95ED\u3002", !boot.launch.configured ? "No launch script. Set it in World settings." : "No stop script. Set it in World settings."), true);
      connCard.append(connHead, connMeta, urlRow, connActions, warn);
    } else {
      connCard.append(connHead, connMeta, urlRow, connActions);
    }
    if (boot.warnings.length) connCard.append(ctx.ui.msgline(boot.warnings.join(" \xB7 "), true));
    const healthLine = ctx.ui.msgline("");
    healthLine.style.fontSize = "12px";
    connCard.append(healthLine);
    right.append(connCard);
    right.append(actionFloat);
    const renderHealth = (health) => {
      const ok = health.ok;
      connBadge.replaceChildren();
      const d = ctx.ui.h("span", "coo-conn-dot " + (ok ? "on" : "off"));
      connBadge.append(d, document.createTextNode(ok ? t("\u5728\u7EBF", "Online") : t("\u79BB\u7EBF", "Offline")));
      connBadge.style.background = ok ? "rgba(60,180,90,.14)" : "rgba(220,60,60,.12)";
      healthLine.classList.toggle("bad", !ok);
      healthLine.textContent = ok ? t(`ComfyUI \u5728\u7EBF\uFF1A${health.system ?? health.url}`, `ComfyUI online: ${health.system ?? health.url}`) : t(`ComfyUI \u79BB\u7EBF\uFF1A${health.error ?? health.url}`, `ComfyUI offline: ${health.error ?? health.url}`);
      renderConnMeta();
    };
    const applyModelRefresh = (res) => {
      checkpoints = res.checkpoints;
      loras = res.loras;
      controlNets = res.control_nets ?? [];
      boot.health = res.health;
      shared.checkpoints = checkpoints;
      shared.loras = loras;
      shared.controlNets = controlNets;
      setOptions(checkpointSelect, checkpoints, state.checkpoint);
      if (!checkpoints.includes(state.checkpoint)) state.checkpoint = checkpoints[0] ?? state.checkpoint;
      if (checkpoints.length) checkpointSelect.value = state.checkpoint;
      setOptions(samplerSelect, res.samplers, state.sampler);
      setOptions(schedulerSelect, res.schedulers, state.scheduler);
      renderHealth(res.health);
      renderLoraTable();
      renderCheckpointEmpty();
    };
    const doRefreshModels = async () => {
      try {
        const res = await ctx.invoke("refreshModels");
        if (!alive) return;
        applyModelRefresh(res);
      } catch (e) {
        healthLine.classList.add("bad");
        healthLine.textContent = t("\u5237\u65B0\u5931\u8D25\uFF1A", "Refresh failed: ") + errText(e);
      }
    };
    saveUrl.addEventListener("click", () => {
      const value = urlInput.value.trim();
      if (!/^https?:\/\//i.test(value)) {
        healthLine.classList.add("bad");
        healthLine.textContent = t("\u5730\u5740\u8981\u4EE5 http:// \u6216 https:// \u5F00\u5934", "URL must start with http:// or https://");
        return;
      }
      void (async () => {
        try {
          await ctx.setConfig("world:draw-local", { "worlds.draw.localUrl": value });
          boot.config.url = value;
          ctx.ui.toast(t("\u5730\u5740\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u68C0\u6D4B\u2026", "URL saved; checking\u2026"));
          const res = await ctx.invoke("health");
          boot.health = res.health;
          renderHealth(res.health);
          await doRefreshModels();
        } catch (e) {
          healthLine.classList.add("bad");
          healthLine.textContent = errText(e);
        }
      })();
    });
    refreshBtn.addEventListener("click", () => {
      void doRefreshModels();
    });
    checkBtn.addEventListener("click", () => {
      void (async () => {
        try {
          const res = await ctx.invoke("health");
          if (!alive) return;
          boot.health = res.health;
          renderHealth(res.health);
          if (res.health.ok) await doRefreshModels();
        } catch (e) {
          healthLine.classList.add("bad");
          healthLine.textContent = errText(e);
        }
      })();
    });
    launchBtn.addEventListener("click", () => {
      void (async () => {
        const busyHandle = ctx.ui.busy(t("\u542F\u52A8 ComfyUI", "Launching ComfyUI"), t("\u7B49\u5F85 /system_stats \u5C31\u7EEA\u2026", "Waiting for /system_stats\u2026"));
        launchBtn.disabled = true;
        stopBtn.disabled = true;
        try {
          const res = await ctx.invoke("launch");
          if (!alive) return;
          ctx.ui.toast(res.message, res.ok ? "ok" : "bad");
          healthLine.classList.toggle("bad", !res.ok);
          healthLine.textContent = res.message;
          if (res.ok) await doRefreshModels();
        } catch (e) {
          ctx.ui.toast(errText(e), "bad");
        } finally {
          busyHandle.dispose();
          launchBtn.disabled = !boot.launch.configured;
          stopBtn.disabled = !boot.launch.stop_configured;
        }
      })();
    });
    stopBtn.addEventListener("click", () => {
      void (async () => {
        const ok = await ctx.ui.confirm({ title: t("\u786E\u5B9A\u5173\u95ED ComfyUI\uFF1F", "Close ComfyUI?"), body: t("\u5C06\u6267\u884C\u5173\u95ED\u811A\u672C\uFF0C\u6B63\u5728\u8FDB\u884C\u7684\u4EFB\u52A1\u4F1A\u4E2D\u65AD\u3002", "The stop script will run and interrupt tasks."), danger: true });
        if (!ok) return;
        const busyHandle = ctx.ui.busy(t("\u5173\u95ED ComfyUI", "Stopping ComfyUI"), t("\u6B63\u5728\u7B49\u5F85\u8FDB\u7A0B\u9000\u51FA\u2026", "Waiting for process to exit\u2026"));
        stopBtn.disabled = true;
        launchBtn.disabled = true;
        try {
          const res = await ctx.invoke("stop");
          if (!alive) return;
          ctx.ui.toast(res.message, res.ok ? "ok" : "bad");
          healthLine.classList.toggle("bad", !res.ok);
          healthLine.textContent = res.message;
          const h = await ctx.invoke("health");
          if (!alive) return;
          boot.health = h.health;
          renderHealth(h.health);
        } catch (e) {
          ctx.ui.toast(errText(e), "bad");
        } finally {
          busyHandle.dispose();
          launchBtn.disabled = !boot.launch.configured;
          stopBtn.disabled = !boot.launch.stop_configured;
        }
      })();
    });
    const progressCard = ctx.ui.h("div", "coo-progress-card is-idle");
    const progressTitle = ctx.ui.h("div", "coo-group-title", t("\u751F\u6210\u8FDB\u5EA6", "Progress"));
    const progress = ctx.ui.progress({ max: Math.max(1, state.steps), value: 0, label: t("\u7B49\u5F85\u5F00\u59CB", "Idle"), format: (v, m) => `${Math.round(v / Math.max(1, m) * 100)}%` });
    const stageLine = ctx.ui.msgline("");
    stageLine.style.fontSize = "12px";
    const progressDetail = ctx.ui.h("div", "coo-progress-detail", "");
    const previewWrap = ctx.ui.h("div", "");
    const previewImg = ctx.ui.h("img", "coo-preview-thumb");
    previewImg.style.display = "none";
    previewWrap.append(previewImg);
    const viewWorksBtn = ctx.ui.button(t("\u67E5\u770B\u4F5C\u54C1", "View works"), { variant: "primary", size: "sm" });
    viewWorksBtn.prepend(svgIcon("arrowRight", 14));
    viewWorksBtn.style.display = "none";
    viewWorksBtn.addEventListener("click", () => {
      const host = ctx.root.closest(".coo-draw-studio")?.parentElement ?? ctx.root;
      host.dispatchEvent(new CustomEvent("coo-switch-tab", { detail: "works", bubbles: true }));
      const maybe = ctx;
      if (maybe.switchTab) maybe.switchTab("works");
    });
    progressCard.append(progressTitle, progress.el, stageLine, progressDetail, previewWrap, viewWorksBtn);
    right.append(progressCard);
    let startTime = null;
    const renderTask = (task) => {
      shared.current = task;
      if (!task) {
        progressCard.classList.add("is-idle");
        progress.setValue(0, 1);
        progress.setLabel(t("\u7A7A\u95F2", "Idle"));
        stageLine.textContent = t("\u7A7A\u95F2", "Idle");
        stageLine.style.display = "";
        progressDetail.textContent = "";
        progressDetail.style.display = "none";
        previewImg.style.display = "none";
        viewWorksBtn.style.display = "none";
        generateBtn.disabled = busy;
        cancelBtn.disabled = true;
        updateGenerateEnabled();
        return;
      }
      progressCard.classList.remove("is-idle");
      stageLine.style.display = "";
      progressDetail.style.display = "";
      const total = Math.max(1, task.progress.total || task.params.steps || 1);
      const cur = task.status === "done" ? total : Math.min(total, task.progress.current || 0);
      progress.setValue(cur, total);
      progress.setLabel(task.status === "done" ? t("\u5B8C\u6210", "done") : task.status === "error" ? t("\u5931\u8D25", "failed") : task.status === "cancelled" ? t("\u5DF2\u53D6\u6D88", "cancelled") : t("\u751F\u6210\u4E2D", "running"));
      const elapsed = task.finished_at ? Math.round((task.finished_at - task.created_at) / 1e3) : startTime ? Math.round((Date.now() - startTime) / 1e3) : Math.round((Date.now() - task.created_at) / 1e3);
      const estimate = cur > 0 && cur < total ? Math.round(elapsed / cur * (total - cur)) : 0;
      stageLine.textContent = [task.status, task.progress.message ?? "", `${cur}/${total}`, `${elapsed}s`, estimate ? t(`\u9884\u8BA1\u5269\u4F59 ${estimate}s`, `~${estimate}s left`) : "", task.error ?? ""].filter(Boolean).join(" \xB7 ");
      stageLine.classList.toggle("bad", task.status === "error");
      progressDetail.textContent = task.status === "running" ? t(`\u6B65\u6570\uFF1A${cur} / ${total}  \xB7 \u5DF2\u7528\uFF1A${elapsed}s${estimate ? ` \xB7 \u9884\u8BA1\u5269\u4F59\uFF1A${estimate}s` : ""}`, `Step ${cur}/${total} \xB7 ${elapsed}s${estimate ? ` \xB7 ~${estimate}s left` : ""}`) : stageLine.textContent;
      generateBtn.disabled = busy || isActive(task);
      cancelBtn.disabled = !isActive(task);
      if (task.status === "done") {
        viewWorksBtn.style.display = "";
        if (task.images[0]) {
          void ctx.invokeBinary("image", [task.images[0].id]).then((blob) => {
            if (!alive) return;
            const url = URL.createObjectURL(blob);
            previewImg.src = url;
            previewImg.style.display = "block";
            previewImg.addEventListener("load", () => {
            }, { once: true });
          }).catch(() => {
          });
        }
      } else if (task.status === "running") {
        viewWorksBtn.style.display = "none";
        if (!startTime) startTime = Date.now();
      } else {
        viewWorksBtn.style.display = "none";
      }
      updateGenerateEnabled();
    };
    const updateProgressMax = () => {
      if (!current || isActive(current)) {
      }
    };
    const refreshHistory = async () => {
      try {
        const res = await ctx.invoke("history", [Math.max(1, boot.config.history_limit)]);
        if (!alive) return;
        history = res.history;
        shared.history = history;
        shared.current = res.task;
        current = res.task;
        renderTask(current);
        if (current && current.status === "done" && current.id !== lastFinished) {
          lastFinished = current.id;
          shared.lastFinished = lastFinished;
          showTaskResult(current);
        }
      } catch {
      }
    };
    const showTaskResult = (task) => {
      if (task.id === shared.lastFinished) {
      }
      const entry = history.find((item) => item.id === task.images[0]?.id);
      if (entry) {
        shared.resultEntry = entry;
        resultEntry = entry;
      }
    };
    const afterTask = async (task) => {
      if (task.id === lastFinished) return;
      lastFinished = task.id;
      shared.lastFinished = lastFinished;
      if (task.status === "done") {
        await refreshHistory();
        const ent = history.find((h) => h.id === task.images[0]?.id);
        if (ent) {
          shared.resultEntry = ent;
        }
        say(t("\u753B\u597D\u4E86\uFF0C\u5DF2\u7ECF\u4FDD\u5B58\u3002", "Done and saved."));
        ctx.ui.toast(t("\u753B\u597D\u4E86", "Done"));
      } else if (task.status === "error") {
        say(task.error ?? t("\u51FA\u56FE\u5931\u8D25", "Generation failed"), true);
        ctx.ui.toast(t("\u51FA\u56FE\u5931\u8D25", "Generation failed"), "bad");
      } else if (task.status === "cancelled") say(t("\u5DF2\u53D6\u6D88\u3002", "Cancelled."));
    };
    const poll = async () => {
      if (!current || !isActive(current)) return;
      try {
        const res = await ctx.invoke("status");
        if (!alive) return;
        current = res.task;
        renderTask(current);
        if (current && !isActive(current)) await afterTask(current);
      } catch {
      }
    };
    ctx.interval(() => {
      void poll();
    }, 800);
    async function generate() {
      if (busy) return;
      if (isActive(current)) {
        say(t("\u4E0A\u4E00\u5F20\u8FD8\u5728\u753B\uFF0C\u7B49\u5B83\u5B8C\u6210\u6216\u70B9\u53D6\u6D88\u3002", "Previous picture still running; wait or cancel."));
        return;
      }
      if (!state.positive.trim()) {
        say(t("\u5148\u5199\u6B63\u5411\u63D0\u793A\u8BCD\u3002", "Write a positive prompt first."), true);
        positive.focus();
        return;
      }
      if (!state.checkpoint && checkpoints.length > 0) {
        say(t("\u8BF7\u5148\u9009\u62E9 Checkpoint \u6A21\u578B", "Select a checkpoint first"), true);
        return;
      }
      if (checkpoints.length === 0) {
        const preset = presets.find((p) => p.id === state.workflow);
        const needs = ["quick-txt2img", "quick-img2img", "quick-controlnet"].includes(state.workflow) || preset?.kind === "txt2img" || preset?.kind === "img2img" || preset?.kind === "controlnet";
        if (needs) {
          say(t("\u672A\u68C0\u6D4B\u5230 Checkpoint\uFF0C\u65E0\u6CD5\u751F\u6210\u3002\u8BF7\u5148\u653E\u5165\u6A21\u578B\u5E76\u5237\u65B0\u3002", "No checkpoint detected; put model files and refresh."), true);
          return;
        }
      }
      busy = true;
      generateBtn.disabled = true;
      say(t("\u6B63\u5728\u63D0\u4EA4\u2026", "Submitting\u2026"));
      startTime = Date.now();
      try {
        const res = await ctx.invoke("generate", [collect()]);
        if (!alive) return;
        if (!res.ok || !res.task) {
          say(res.error ?? t("\u63D0\u4EA4\u5931\u8D25", "Submit failed"), true);
          return;
        }
        current = res.task;
        shared.current = current;
        lastFinished = "";
        shared.lastFinished = "";
        renderTask(current);
        persistLora();
        if (res.warnings?.length) say(res.warnings.join("\uFF1B"), false);
        else say(t("\u5DF2\u63D0\u4EA4\uFF0C\u7B49\u5F85 ComfyUI\u2026", "Submitted; waiting for ComfyUI\u2026"));
        void refreshHistory();
      } catch (e) {
        say(errText(e), true);
      } finally {
        busy = false;
        generateBtn.disabled = isActive(current);
        updateGenerateEnabled();
      }
    }
    generateBtn.addEventListener("click", () => {
      void generate();
    });
    cancelBtn.addEventListener("click", () => {
      if (!current) return;
      void (async () => {
        try {
          await ctx.invoke("cancel", [current?.id]);
          ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u53D6\u6D88", "Cancel requested"));
          const res = await ctx.invoke("status");
          if (!alive) return;
          current = res.task;
          shared.current = current;
          renderTask(current);
        } catch (e) {
          say(errText(e), true);
        }
      })();
    });
    renderTask(current);
    if (current && isActive(current)) void poll();
  }
};
var worksPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    let alive = true;
    ctx.own({ dispose: () => {
      alive = false;
    } });
    let boot;
    try {
      boot = await ctx.invoke("bootstrap");
    } catch (e) {
      const sheet = ctx.ui.sheet({ title: t("\u4F5C\u54C1", "Works") });
      sheet.body.append(ctx.ui.msgline(t("\u8BFB\u53D6\u5931\u8D25\uFF1A", "Failed: ") + errText(e), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;
    let allHistory = shared.history.length ? shared.history : boot.history;
    shared.history = allHistory;
    let pageLimit = Math.max(50, boot.config.history_limit);
    const fetchHistory = async (limit = pageLimit) => {
      try {
        const res = await ctx.invoke("history", [limit]);
        if (!alive) return;
        allHistory = res.history;
        shared.history = allHistory;
        refreshModelOptions();
        refreshLoraFilterOptions();
        renderGallery();
        if (res.task) {
          shared.current = res.task;
        }
      } catch {
      }
    };
    const VIEWED_KEY = "coo-works-viewed";
    const FIELD_KEY = "coo-works-fields";
    const loadViewed = () => {
      try {
        const raw = localStorage.getItem(VIEWED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return /* @__PURE__ */ new Set();
      }
    };
    const saveViewed = (s) => {
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify([...s]));
      } catch {
      }
    };
    let viewed = loadViewed();
    const markViewed = (id) => {
      if (!viewed.has(id)) {
        viewed.add(id);
        saveViewed(viewed);
        dispatchUnread();
      }
    };
    const dispatchUnread = () => {
      const unread = allHistory.filter((h) => !viewed.has(h.id)).length;
      ctx.root.dispatchEvent(new CustomEvent("coo-works-unread", { detail: unread, bubbles: true }));
      try {
        const host = ctx.root.closest(".coo-draw-studio")?.parentElement ?? document.body;
        const seg = host.parentElement?.querySelector('[role="tablist"], .segmented') || host.querySelector(".segmented");
        if (seg) {
          let dot = seg.querySelector(".coo-tab-dot");
          if (unread > 0) {
            if (!dot) {
              dot = document.createElement("span");
              dot.className = "coo-tab-dot";
              const btn = Array.from(seg.querySelectorAll("button")).find((b) => b.textContent?.includes(t("\u4F5C\u54C1", "Works")));
              if (btn) btn.append(dot);
              else seg.append(dot);
            }
          } else if (dot) dot.remove();
        }
      } catch {
      }
    };
    const DEFAULT_FIELDS = [
      { id: "filename", labelZh: "\u6587\u4EF6\u540D", labelEn: "File" },
      { id: "seed", labelZh: "\u79CD\u5B50", labelEn: "Seed" },
      { id: "size", labelZh: "\u5C3A\u5BF8", labelEn: "Size" },
      { id: "lora", labelZh: "LoRA", labelEn: "LoRA" },
      { id: "model", labelZh: "\u6A21\u578B", labelEn: "Model" },
      { id: "time", labelZh: "\u65F6\u95F4", labelEn: "Time" },
      { id: "sampler", labelZh: "\u91C7\u6837\u53C2\u6570", labelEn: "Sampler" },
      { id: "prompt", labelZh: "\u63D0\u793A\u8BCD", labelEn: "Prompt" },
      { id: "negative", labelZh: "\u53CD\u5411", labelEn: "Negative" }
    ];
    const loadFieldConfig = () => {
      try {
        const raw = localStorage.getItem(FIELD_KEY);
        if (raw) {
          const o = JSON.parse(raw);
          const order = o.order?.filter((x) => DEFAULT_FIELDS.some((f) => f.id === x)) ?? DEFAULT_FIELDS.map((f) => f.id);
          for (const f of DEFAULT_FIELDS) if (!order.includes(f.id)) order.push(f.id);
          return { order, hidden: new Set(o.hidden ?? []) };
        }
      } catch {
      }
      return { order: DEFAULT_FIELDS.map((f) => f.id), hidden: /* @__PURE__ */ new Set() };
    };
    let fieldConfig = loadFieldConfig();
    const saveFieldConfig = () => {
      try {
        localStorage.setItem(FIELD_KEY, JSON.stringify({ order: fieldConfig.order, hidden: [...fieldConfig.hidden] }));
      } catch {
      }
    };
    const root = ctx.ui.h("div", "coo-works");
    const left = ctx.ui.h("div", "coo-works-gallery");
    const right = ctx.ui.h("div", "coo-works-detail");
    root.append(left, right);
    ctx.root.append(root);
    const filters = ctx.ui.h("div", "coo-works-filters");
    const searchInput = ctx.ui.input({ type: "search", placeholder: t("\u641C\u7D22\u63D0\u793A\u8BCD / \u79CD\u5B50 / \u6587\u4EF6\u540D", "Search prompt / seed / filename") });
    searchInput.classList.add("coo-filter-search");
    const dateWrap = ctx.ui.h("div", "coo-filter-date");
    const dateFrom = ctx.ui.input({ type: "date" });
    dateFrom.title = t("\u5F00\u59CB\u65E5\u671F", "From");
    const dateTo = ctx.ui.input({ type: "date" });
    dateTo.title = t("\u7ED3\u675F\u65E5\u671F", "To");
    const dateSep = ctx.ui.h("span", "", "\u2014");
    dateWrap.append(dateFrom, dateSep, dateTo);
    const modelSelect = ctx.ui.select({ options: [{ value: "", label: t("\u5168\u90E8\u6A21\u578B", "All models") }] });
    const sizeSelect = ctx.ui.select({ options: [{ value: "", label: t("\u5168\u90E8\u5C3A\u5BF8", "All sizes") }] });
    const loraFilterBtn = ctx.ui.button(t("\u5168\u90E8 LoRA", "All LoRAs"), { size: "sm" });
    loraFilterBtn.style.minWidth = "110px";
    let loraFilterSelected = /* @__PURE__ */ new Set();
    const loraFilterPanel = ctx.ui.h("div", "coo-field-settings");
    loraFilterPanel.style.display = "none";
    loraFilterPanel.style.right = "auto";
    loraFilterPanel.style.left = "0";
    const sortSelect = ctx.ui.select({ options: [
      { value: "time_desc", label: t("\u65F6\u95F4\u5012\u5E8F", "Newest") },
      { value: "time_asc", label: t("\u65F6\u95F4\u6B63\u5E8F", "Oldest") },
      { value: "size_desc", label: t("\u5C3A\u5BF8\u4ECE\u5927\u5230\u5C0F", "Size \u2193") },
      { value: "size_asc", label: t("\u5C3A\u5BF8\u4ECE\u5C0F\u5230\u5927", "Size \u2191") }
    ] });
    sortSelect.value = "time_desc";
    const clearBtn = ctx.ui.button(t("\u6E05\u9664\u7B5B\u9009", "Clear"), { size: "sm", variant: "plain" });
    clearBtn.style.display = "none";
    const loraFilterWrap = ctx.ui.h("div", "");
    loraFilterWrap.style.position = "relative";
    loraFilterWrap.append(loraFilterBtn, loraFilterPanel);
    filters.append(searchInput, dateWrap, modelSelect, sizeSelect, loraFilterWrap, sortSelect, clearBtn);
    left.append(filters);
    const refreshModelOptions = () => {
      const models = [...new Set(allHistory.map((h) => h.checkpoint).filter(Boolean))].sort();
      const cur = modelSelect.value;
      modelSelect.replaceChildren();
      const optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = t("\u5168\u90E8\u6A21\u578B", "All models");
      modelSelect.append(optAll);
      for (const m of models) {
        const o = document.createElement("option");
        o.value = m;
        o.textContent = stripExt(m);
        o.title = m;
        modelSelect.append(o);
      }
      if (cur) modelSelect.value = cur;
      const sizesFromLib = [...new Set(allHistory.map((h) => `${h.width}x${h.height}`))].sort((a, b) => {
        const [aw, ah] = a.split("x").map(Number);
        const [bw, bh] = b.split("x").map(Number);
        return bw * bh - aw * ah;
      });
      const presetSizes = SIZE_PRESETS.filter((p) => p.value !== "custom").map((p) => p.value);
      const allSizes = [.../* @__PURE__ */ new Set([...presetSizes, ...sizesFromLib])];
      const curSize = sizeSelect.value;
      sizeSelect.replaceChildren();
      const sAll = document.createElement("option");
      sAll.value = "";
      sAll.textContent = t("\u5168\u90E8\u5C3A\u5BF8", "All sizes");
      sizeSelect.append(sAll);
      for (const s of allSizes) {
        const o = document.createElement("option");
        o.value = s;
        o.textContent = s;
        sizeSelect.append(o);
      }
      if (curSize) sizeSelect.value = curSize;
    };
    refreshModelOptions();
    const allLorasInLib = () => {
      const map = /* @__PURE__ */ new Map();
      for (const h of allHistory) for (const l of h.loras) if (!map.has(l.path)) map.set(l.path, stripExt(l.name));
      if (!map.size && boot.loras) {
        for (const l of boot.loras) if (!map.has(l.path)) map.set(l.path, stripExt(l.name));
      }
      return [...map.entries()].map(([path, name]) => ({ path, name })).sort((a, b) => a.name.localeCompare(b.name));
    };
    const refreshLoraFilterOptions = () => {
      const list = allLorasInLib();
      loraFilterPanel.replaceChildren();
      if (!list.length) {
        loraFilterPanel.append(ctx.ui.msgline(t("\u6682\u65E0 LoRA", "No LoRA"), false));
        return;
      }
      for (const item of list) {
        const row = ctx.ui.h("div", "item");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = loraFilterSelected.has(item.path);
        chk.addEventListener("change", () => {
          if (chk.checked) loraFilterSelected.add(item.path);
          else loraFilterSelected.delete(item.path);
          updateLoraBtn();
          renderGallery();
        });
        const lab = ctx.ui.h("span", "", item.name);
        lab.title = item.path;
        lab.style.flex = "1";
        lab.style.overflow = "hidden";
        lab.style.textOverflow = "ellipsis";
        lab.style.whiteSpace = "nowrap";
        row.append(chk, lab);
        loraFilterPanel.append(row);
      }
      const actions = ctx.ui.h("div", "");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.style.marginTop = "8px";
      const ok = ctx.ui.button(t("\u786E\u5B9A", "OK"), { size: "sm", variant: "primary" });
      ok.addEventListener("click", () => loraFilterPanel.style.display = "none");
      const clear = ctx.ui.button(t("\u6E05\u7A7A", "Clear"), { size: "sm" });
      clear.addEventListener("click", () => {
        loraFilterSelected.clear();
        loraFilterPanel.querySelectorAll('input[type="checkbox"]').forEach((c) => c.checked = false);
        updateLoraBtn();
        renderGallery();
      });
      actions.append(clear, ok);
      loraFilterPanel.append(actions);
    };
    const updateLoraBtn = () => {
      if (!loraFilterSelected.size) loraFilterBtn.textContent = t("\u5168\u90E8 LoRA", "All LoRAs");
      else loraFilterBtn.textContent = t(`${loraFilterSelected.size} \u4E2A LoRA`, `${loraFilterSelected.size} LoRAs`);
    };
    loraFilterBtn.addEventListener("click", () => {
      loraFilterPanel.style.display = loraFilterPanel.style.display === "none" ? "block" : "none";
      if (loraFilterPanel.style.display === "block") refreshLoraFilterOptions();
    });
    document.addEventListener("click", (e) => {
      if (!loraFilterWrap.contains(e.target)) loraFilterPanel.style.display = "none";
    });
    refreshLoraFilterOptions();
    const statsRow = ctx.ui.h("div", "coo-works-stats");
    const statsText = ctx.ui.h("span", "", "");
    const statsActions = ctx.ui.h("div", "coo-batch-bar");
    const batchToggle = ctx.ui.button(t("\u6279\u91CF\u6A21\u5F0F", "Batch"), { size: "sm", variant: "plain" });
    statsActions.append(batchToggle);
    statsRow.append(statsText, statsActions);
    left.append(statsRow);
    const grid = ctx.ui.h("div", "coo-works-grid");
    const loadMoreBtn = ctx.ui.button(t("\u52A0\u8F7D\u66F4\u591A", "Load more"), { size: "sm" });
    loadMoreBtn.style.display = allHistory.length >= pageLimit ? "" : "none";
    left.append(grid, loadMoreBtn);
    let batchMode = false;
    const selected = /* @__PURE__ */ new Set();
    const compareBar = ctx.ui.h("div", "coo-compare-bar");
    compareBar.style.display = "none";
    const compareTip = ctx.ui.h("span", "", "");
    const cancelCompare = ctx.ui.button(t("\u53D6\u6D88\u5BF9\u6BD4", "Cancel"), { size: "sm" });
    compareBar.append(compareTip, cancelCompare);
    right.append(compareBar);
    const previewWrap = ctx.ui.h("div", "coo-works-preview-wrap");
    previewWrap.style.display = "none";
    const preview = document.createElement("img");
    preview.alt = "";
    preview.style.display = "block";
    const overlay = ctx.ui.h("div", "coo-preview-overlay", t("\u70B9\u51FB\u67E5\u770B\u539F\u56FE", "Click to view original"));
    previewWrap.append(preview, overlay);
    const empty = ctx.ui.placeholder(t("\u70B9\u51FB\u5DE6\u4FA7\u7F29\u7565\u56FE\u67E5\u770B\u5927\u56FE\u4E0E\u64CD\u4F5C", "Click a thumbnail to view details"));
    const emptyState = ctx.ui.h("div", "coo-works-empty");
    emptyState.style.display = "none";
    const emptyTitle = ctx.ui.h("div", "title", "");
    const emptySub = ctx.ui.h("div", "sub", "");
    const emptyAction = ctx.ui.h("div", "");
    emptyState.append(emptyTitle, emptySub, emptyAction);
    right.append(previewWrap, empty);
    left.append(emptyState);
    const metaCard = ctx.ui.h("div", "coo-meta-card");
    const metaHead = ctx.ui.h("div", "coo-meta-head");
    const metaTitle = ctx.ui.h("div", "coo-meta-title", t("\u5143\u4FE1\u606F", "Metadata"));
    const fieldBtn = document.createElement("button");
    fieldBtn.className = "coo-info-btn";
    fieldBtn.title = t("\u5B57\u6BB5\u8BBE\u7F6E", "Fields");
    fieldBtn.textContent = "\u2699";
    metaHead.append(metaTitle, fieldBtn);
    const metaGrid = ctx.ui.h("div", "coo-meta-grid");
    metaCard.append(metaHead, metaGrid);
    const fieldPanel = ctx.ui.h("div", "coo-field-settings");
    fieldPanel.style.display = "none";
    const buildFieldPanel = () => {
      fieldPanel.replaceChildren();
      for (let i = 0; i < fieldConfig.order.length; i++) {
        const id = fieldConfig.order[i];
        const def = DEFAULT_FIELDS.find((f) => f.id === id);
        const row = ctx.ui.h("div", "item");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = !fieldConfig.hidden.has(id);
        chk.addEventListener("change", () => {
          if (chk.checked) fieldConfig.hidden.delete(id);
          else fieldConfig.hidden.add(id);
          saveFieldConfig();
          renderMeta(activeEntry);
        });
        const lab = ctx.ui.h("span", "", zh ? def.labelZh : def.labelEn);
        lab.style.flex = "1";
        const up = ctx.ui.button("\u2191", { size: "sm" });
        up.disabled = i === 0;
        up.addEventListener("click", () => {
          if (i > 0) {
            const tmp = fieldConfig.order[i - 1];
            fieldConfig.order[i - 1] = fieldConfig.order[i];
            fieldConfig.order[i] = tmp;
            saveFieldConfig();
            buildFieldPanel();
            renderMeta(activeEntry);
          }
        });
        const down = ctx.ui.button("\u2193", { size: "sm" });
        down.disabled = i === fieldConfig.order.length - 1;
        down.addEventListener("click", () => {
          if (i < fieldConfig.order.length - 1) {
            const tmp = fieldConfig.order[i + 1];
            fieldConfig.order[i + 1] = fieldConfig.order[i];
            fieldConfig.order[i] = tmp;
            saveFieldConfig();
            buildFieldPanel();
            renderMeta(activeEntry);
          }
        });
        row.append(chk, lab, up, down);
        fieldPanel.append(row);
      }
      const reset = ctx.ui.button(t("\u6062\u590D\u9ED8\u8BA4", "Reset"), { size: "sm" });
      reset.addEventListener("click", () => {
        fieldConfig = { order: DEFAULT_FIELDS.map((f) => f.id), hidden: /* @__PURE__ */ new Set() };
        saveFieldConfig();
        buildFieldPanel();
        renderMeta(activeEntry);
      });
      fieldPanel.append(reset);
    };
    buildFieldPanel();
    metaHead.style.position = "relative";
    metaHead.append(fieldPanel);
    fieldBtn.addEventListener("click", () => {
      fieldPanel.style.display = fieldPanel.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", (e) => {
      if (!metaHead.contains(e.target)) fieldPanel.style.display = "none";
    });
    const opsCard = ctx.ui.h("div", "coo-meta-card");
    const opsTitle = ctx.ui.h("div", "coo-meta-title", t("\u64CD\u4F5C", "Actions"));
    opsCard.append(opsTitle);
    const opsGroups = ctx.ui.h("div", "coo-ops-groups");
    opsCard.append(opsGroups);
    right.append(metaCard, opsCard);
    const batchBar = ctx.ui.h("div", "coo-works-batch-actions");
    batchBar.style.display = "none";
    const batchCount = ctx.ui.h("span", "", "");
    const batchDel = ctx.ui.button(t("\u6279\u91CF\u5220\u9664", "Delete selected"), { size: "sm", variant: "plain" });
    batchDel.style.color = "#c44";
    const batchExport = ctx.ui.button(t("\u6279\u91CF\u5BFC\u51FA", "Export"), { size: "sm" });
    const batchFav = ctx.ui.button(t("\u6279\u91CF\u6536\u85CF", "Favorite"), { size: "sm" });
    batchBar.append(batchCount, batchDel, batchExport, batchFav);
    right.append(batchBar);
    let activeEntry = shared.resultEntry ?? allHistory[0] ?? null;
    let activePreviewUrl = "";
    let compareA = null;
    let compareB = null;
    let compareMode = false;
    ctx.own({ dispose: () => {
      if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
    } });
    const imageUrls = [];
    ctx.own({ dispose: () => {
      for (const u of imageUrls) URL.revokeObjectURL(u);
    } });
    const openLightbox = (src, filename) => {
      const box = ctx.ui.h("div", "coo-lightbox");
      const img = document.createElement("img");
      img.src = src;
      img.alt = filename;
      const close = ctx.ui.h("button", "close", "\xD7");
      close.addEventListener("click", () => box.remove());
      box.append(img, close);
      box.addEventListener("click", (e) => {
        if (e.target === box) box.remove();
      });
      const onKey = (e) => {
        if (e.key === "Escape") {
          box.remove();
          document.removeEventListener("keydown", onKey);
        }
      };
      document.addEventListener("keydown", onKey);
      document.body.append(box);
    };
    previewWrap.addEventListener("click", () => {
      if (preview.src) openLightbox(preview.src, activeEntry?.filename ?? "");
    });
    const renderMeta = (entry) => {
      metaGrid.replaceChildren();
      if (!entry) {
        metaGrid.append(ctx.ui.msgline(t("\u8BF7\u9009\u62E9\u4E00\u5F20\u56FE", "Select a picture")));
        return;
      }
      const addRow = (id, label, valueEl, copyVal, placeholder) => {
        if (fieldConfig.hidden.has(id)) return;
        const row = ctx.ui.h("div", "coo-meta-row");
        const isMultiline = id === "prompt" || id === "negative" || id === "lora";
        if (isMultiline) row.classList.add("coo-meta-row--multiline");
        const kk = ctx.ui.h("div", "k", label);
        const vv = ctx.ui.h("div", "v");
        if (typeof valueEl === "string") {
          if (!valueEl && placeholder) {
            const ph = ctx.ui.h("span", "placeholder", placeholder);
            vv.append(ph);
          } else vv.textContent = valueEl;
        } else vv.append(valueEl);
        row.append(kk, vv);
        if (copyVal) {
          const copy = ctx.ui.copyButton(() => copyVal, { size: "sm", label: t("\u590D\u5236", "Copy") });
          copy.classList.add("copy-btn");
          row.append(copy);
        }
        metaGrid.append(row);
      };
      addRow("filename", t("\u6587\u4EF6\u540D", "File"), entry.filename, entry.filename);
      addRow("seed", t("\u79CD\u5B50", "Seed"), String(entry.seed), String(entry.seed));
      addRow("size", t("\u5C3A\u5BF8", "Size"), `${entry.width}\xD7${entry.height}`);
      {
        if (!fieldConfig.hidden.has("lora")) {
          const row = ctx.ui.h("div", "coo-meta-row coo-meta-row--multiline");
          const kk = ctx.ui.h("div", "k", "LoRA");
          const vv = ctx.ui.h("div", "v");
          if (!entry.loras.length) {
            const ph = ctx.ui.h("span", "placeholder", t("\u672A\u4F7F\u7528", "Not used"));
            vv.append(ph);
          } else {
            const chips = ctx.ui.h("div", "coo-lora-chips");
            for (const l of entry.loras) {
              const chip = ctx.ui.h("div", "coo-lora-chip");
              const name = stripExt(l.name);
              const txt = document.createElement("span");
              txt.textContent = name;
              txt.title = l.path;
              const dot = document.createElement("span");
              dot.textContent = "\xB7";
              dot.className = "weight";
              const w = document.createElement("span");
              w.textContent = String(l.weight);
              w.className = "weight";
              chip.append(txt, dot, w);
              chip.title = `${l.path} \xB7 ${l.weight}`;
              chips.append(chip);
            }
            vv.append(chips);
          }
          row.append(kk, vv);
          metaGrid.append(row);
        }
      }
      addRow("model", t("\u6A21\u578B", "Model"), entry.checkpoint ? stripExt(entry.checkpoint) : "", entry.checkpoint || void 0, t("\u672A\u4F7F\u7528", "Not used"));
      addRow("time", t("\u65F6\u95F4", "Time"), shortDate(entry.created_at));
      addRow("sampler", t("\u91C7\u6837\u53C2\u6570", "Sampler"), `${entry.sampler} \xB7 ${entry.scheduler} \xB7 ${t("\u6B65\u6570", "Steps")} ${entry.steps} \xB7 CFG ${entry.cfg}`);
      {
        if (!fieldConfig.hidden.has("prompt")) {
          const row = ctx.ui.h("div", "coo-meta-row coo-meta-row--multiline");
          const kk = ctx.ui.h("div", "k", t("\u63D0\u793A\u8BCD", "Prompt"));
          const vv = ctx.ui.h("div", "v", entry.positive);
          vv.style.whiteSpace = "pre-wrap";
          row.append(kk, vv);
          const copy = ctx.ui.copyButton(() => entry.positive, { size: "sm", label: t("\u590D\u5236", "Copy") });
          copy.classList.add("copy-btn");
          row.append(copy);
          metaGrid.append(row);
        }
      }
      {
        if (!entry.negative && fieldConfig.hidden.has("negative")) {
        } else if (!fieldConfig.hidden.has("negative")) {
          const row = ctx.ui.h("div", "coo-meta-row coo-meta-row--multiline");
          const kk = ctx.ui.h("div", "k", t("\u53CD\u5411", "Negative"));
          const vv = ctx.ui.h("div", "v");
          if (!entry.negative) {
            const ph = ctx.ui.h("span", "placeholder", t("\u672A\u4F7F\u7528", "Not used"));
            vv.append(ph);
          } else {
            vv.textContent = entry.negative;
            vv.style.whiteSpace = "pre-wrap";
          }
          row.append(kk, vv);
          if (entry.negative) {
            const copy = ctx.ui.copyButton(() => entry.negative, { size: "sm", label: t("\u590D\u5236", "Copy") });
            copy.classList.add("copy-btn");
            row.append(copy);
          }
          metaGrid.append(row);
        }
      }
      const desired = fieldConfig.order.filter((id) => !fieldConfig.hidden.has(id));
      const rows = Array.from(metaGrid.children);
      const labelMap = {};
      for (const r of rows) {
        const kEl = r.querySelector(".k");
        if (kEl) labelMap[kEl.textContent?.trim() ?? ""] = r;
      }
      const idToLabel = { filename: t("\u6587\u4EF6\u540D", "File"), seed: t("\u79CD\u5B50", "Seed"), size: t("\u5C3A\u5BF8", "Size"), lora: "LoRA", model: t("\u6A21\u578B", "Model"), time: t("\u65F6\u95F4", "Time"), sampler: t("\u91C7\u6837\u53C2\u6570", "Sampler"), prompt: t("\u63D0\u793A\u8BCD", "Prompt"), negative: t("\u53CD\u5411", "Negative") };
      const ordered = [];
      for (const id of desired) {
        const lbl = idToLabel[id];
        const el = labelMap[lbl];
        if (el) ordered.push(el);
      }
      for (const r of rows) if (!ordered.includes(r)) ordered.push(r);
      metaGrid.replaceChildren(...ordered);
    };
    const buildOps = (entry) => {
      opsGroups.replaceChildren();
      if (!entry) {
        opsGroups.append(ctx.ui.msgline(t("\u8BF7\u9009\u62E9\u4E00\u5F20\u56FE", "Select a picture")));
        return;
      }
      const g1 = ctx.ui.h("div", "coo-ops-group");
      const redraw = ctx.ui.button(t("\u91CD\u753B", "Repaint"), { size: "sm", variant: "primary" });
      redraw.style.background = "#2ecc71";
      redraw.style.borderColor = "#2ecc71";
      redraw.style.color = "#fff";
      redraw.addEventListener("click", () => {
        window.__coo_draw_repaint = { entry, mode: "sameSeed" };
        ctx.root.dispatchEvent(new CustomEvent("coo-switch-tab", { detail: "studio", bubbles: true }));
        const m = ctx;
        if (m.switchTab) m.switchTab("studio");
        ctx.ui.toast(t("\u5DF2\u5207\u6362\u5230\u51FA\u56FE\u9875\uFF0C\u5C06\u7528\u76F8\u540C\u53C2\u6570\u91CD\u753B", "Switched to Studio; repaint with same seed"));
      });
      const tweak = ctx.ui.button(t("\u5FAE\u8C03", "Tweak"), { size: "sm" });
      tweak.addEventListener("click", () => {
        window.__coo_draw_repaint = { entry, mode: "randomSeed" };
        ctx.root.dispatchEvent(new CustomEvent("coo-switch-tab", { detail: "studio", bubbles: true }));
        const m = ctx;
        if (m.switchTab) m.switchTab("studio");
        ctx.ui.toast(t("\u5DF2\u5207\u6362\u5230\u51FA\u56FE\u9875\uFF0C\u79CD\u5B50\u5C06\u968F\u673A", "Switched to Studio; seed randomized"));
      });
      const useAll = ctx.ui.button(t("\u4F7F\u7528\u5168\u90E8\u53C2\u6570", "Use all params"), { size: "sm" });
      useAll.addEventListener("click", () => {
        window.__coo_draw_repaint = { entry, mode: "useAll" };
        ctx.root.dispatchEvent(new CustomEvent("coo-switch-tab", { detail: "studio", bubbles: true }));
        const m = ctx;
        if (m.switchTab) m.switchTab("studio");
        ctx.ui.toast(t("\u53C2\u6570\u5DF2\u56DE\u586B\u5230\u51FA\u56FE\u9875", "Params filled to Studio"));
      });
      g1.append(redraw, tweak, useAll);
      const g2 = ctx.ui.h("div", "coo-ops-group");
      const copySeed = ctx.ui.copyButton(() => String(entry.seed), { label: t("\u590D\u5236\u79CD\u5B50", "Copy seed"), size: "sm" });
      const toPet = ctx.ui.button(t("\u53D1\u9001\u5230\u684C\u5BA0", "Send to pet"), { size: "sm" });
      toPet.addEventListener("click", () => {
        void ctx.invoke("sendToPet", [entry.id]).then((res) => ctx.ui.toast(res.message, res.ok ? "ok" : "bad")).catch((e) => ctx.ui.toast(errText(e), "bad"));
      });
      g2.append(copySeed, toPet);
      const g3 = ctx.ui.h("div", "coo-ops-group");
      const compare = ctx.ui.button(t("\u5BF9\u6BD4", "Compare"), { size: "sm" });
      compare.addEventListener("click", () => {
        enterCompare(entry);
      });
      const openFolder = ctx.ui.button(t("\u6253\u5F00\u6587\u4EF6\u5939", "Open folder"), { size: "sm" });
      openFolder.addEventListener("click", () => {
        void ctx.invoke("revealImage", [entry.id]).then(() => ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u4E2D\u663E\u793A", "Revealing in file manager"))).catch(() => void ctx.invoke("openFolder").then(() => ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u6253\u5F00\u6587\u4EF6\u5939", "Opening folder"))).catch((e) => ctx.ui.toast(errText(e), "bad")));
      });
      g3.append(compare, openFolder);
      const g4 = ctx.ui.h("div", "coo-ops-group");
      const fav = ctx.ui.button(t("\u6536\u85CF", "Favorite"), { size: "sm" });
      fav.addEventListener("click", () => {
        ctx.ui.toast(t("\u5DF2\u6536\u85CF\uFF08\u672C\u5730\u6807\u8BB0\uFF09", "Favorited"));
        fav.textContent = "\u2605 " + t("\u5DF2\u6536\u85CF", "Favorited");
      });
      const del = ctx.ui.button(t("\u5220\u9664", "Delete"), { size: "sm", variant: "plain" });
      del.classList.add("btn-danger");
      del.style.color = "#e74c3c";
      del.addEventListener("click", async () => {
        const ok = await ctx.ui.confirm({ title: t("\u5220\u9664\u8FD9\u5F20\uFF1F", "Delete this?"), body: t("\u786E\u5B9A\u5220\u9664\u8FD9\u5F20\u4F5C\u54C1\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002", "Delete this picture? This cannot be undone."), danger: true });
        if (!ok) return;
        allHistory = allHistory.filter((h) => h.id !== entry.id);
        shared.history = allHistory;
        if (activeEntry?.id === entry.id) {
          activeEntry = allHistory[0] ?? null;
          if (activeEntry) void showDetail(activeEntry);
          else {
            previewWrap.style.display = "none";
            empty.style.display = "";
            renderMeta(null);
            buildOps(null);
          }
        }
        renderGallery();
        ctx.ui.toast(t("\u5DF2\u4ECE\u753B\u5ECA\u79FB\u9664\uFF0C\u6587\u4EF6\u4ECD\u4FDD\u7559\u5728\u8F93\u51FA\u76EE\u5F55", "Removed from gallery; file kept"));
      });
      g4.append(fav, del);
      opsGroups.append(g1, g2, g3, g4);
    };
    const enterCompare = (a) => {
      compareA = a;
      compareMode = true;
      compareBar.style.display = "flex";
      compareTip.textContent = t("\u5DF2\u9009 1 \u5F20\uFF0C\u8BF7\u5728\u5DE6\u4FA7\u753B\u5ECA\u518D\u9009 1 \u5F20\u8FDB\u884C\u5BF9\u6BD4", "Selected 1, pick another in gallery to compare");
      ctx.ui.toast(t("\u8BF7\u5728\u5DE6\u4FA7\u753B\u5ECA\u518D\u9009 1 \u5F20", "Pick another in gallery"));
    };
    const exitCompare = () => {
      compareMode = false;
      compareA = null;
      compareB = null;
      compareBar.style.display = "none";
      renderMeta(activeEntry);
      buildOps(activeEntry);
      if (activeEntry) void showDetail(activeEntry);
    };
    cancelCompare.addEventListener("click", exitCompare);
    const showCompare = async (a, b) => {
      compareB = b;
      previewWrap.style.display = "none";
      empty.style.display = "none";
      metaGrid.replaceChildren();
      const wrap = ctx.ui.h("div", "coo-compare-view");
      const paneA = ctx.ui.h("div", "pane");
      const paneB = ctx.ui.h("div", "pane");
      const imgA = document.createElement("img");
      imgA.style.width = "100%";
      imgA.style.borderRadius = "8px";
      imgA.style.border = "1px solid var(--line, rgba(127,127,127,.18))";
      const imgB = document.createElement("img");
      imgB.style.width = "100%";
      imgB.style.borderRadius = "8px";
      imgB.style.border = "1px solid var(--line, rgba(127,127,127,.18))";
      const infoA = ctx.ui.h("div", "", `${t("\u79CD\u5B50", "Seed")} ${a.seed} \xB7 ${a.width}\xD7${a.height} \xB7 ${shortDate(a.created_at)}`);
      infoA.style.fontSize = "12px";
      infoA.style.color = "#8a8f98";
      infoA.style.marginTop = "6px";
      const promptA = ctx.ui.h("div", "", a.positive.slice(0, 120) + (a.positive.length > 120 ? "\u2026" : ""));
      promptA.style.fontSize = "12px";
      promptA.style.lineHeight = "1.5";
      const infoB = ctx.ui.h("div", "", `${t("\u79CD\u5B50", "Seed")} ${b.seed} \xB7 ${b.width}\xD7${b.height} \xB7 ${shortDate(b.created_at)}`);
      infoB.style.fontSize = "12px";
      infoB.style.color = "#8a8f98";
      infoB.style.marginTop = "6px";
      const promptB = ctx.ui.h("div", "", b.positive.slice(0, 120) + (b.positive.length > 120 ? "\u2026" : ""));
      promptB.style.fontSize = "12px";
      promptB.style.lineHeight = "1.5";
      paneA.append(imgA, infoA, promptA);
      paneB.append(imgB, infoB, promptB);
      wrap.append(paneA, paneB);
      const closeBtn = ctx.ui.button(t("\u5173\u95ED\u5BF9\u6BD4", "Close"), { size: "sm" });
      closeBtn.addEventListener("click", exitCompare);
      metaGrid.append(wrap, closeBtn);
      opsGroups.replaceChildren(closeBtn);
      try {
        const blob = await ctx.invokeBinary("image", [a.id]);
        const url = URL.createObjectURL(blob);
        imageUrls.push(url);
        imgA.src = url;
      } catch {
      }
      try {
        const blob = await ctx.invokeBinary("image", [b.id]);
        const url = URL.createObjectURL(blob);
        imageUrls.push(url);
        imgB.src = url;
      } catch {
      }
    };
    const showDetail = async (entry) => {
      activeEntry = entry;
      markViewed(entry.id);
      if (compareMode && compareA && entry.id !== compareA.id) {
        await showCompare(compareA, entry);
        for (const el of Array.from(grid.querySelectorAll(".coo-works-tile"))) {
          el.classList.toggle("sel", el.dataset.id === entry.id || el.dataset.id === compareA.id);
        }
        renderGallery();
        return;
      }
      try {
        const blob = await ctx.invokeBinary("image", [entry.id]);
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
        activePreviewUrl = url;
        preview.src = url;
        previewWrap.style.display = "block";
        empty.style.display = "none";
      } catch (e) {
        empty.textContent = errText(e);
        empty.style.display = "";
        previewWrap.style.display = "none";
      }
      renderMeta(entry);
      buildOps(entry);
      for (const el of Array.from(grid.querySelectorAll(".coo-works-tile"))) {
        el.classList.toggle("sel", el.dataset.id === entry.id);
      }
      renderGallery();
    };
    const filtered = () => {
      const q = searchInput.value.trim().toLowerCase();
      const from = dateFrom.value ? new Date(dateFrom.value).getTime() : 0;
      const to = dateTo.value ? new Date(dateTo.value).getTime() + 864e5 : Infinity;
      const model = modelSelect.value;
      const size = sizeSelect.value;
      let list = allHistory.filter((h) => {
        if (q && !`${h.positive} ${h.negative} ${String(h.seed)} ${h.filename}`.toLowerCase().includes(q)) return false;
        if (h.created_at < from || h.created_at > to) return false;
        if (model && h.checkpoint !== model) return false;
        if (size && `${h.width}x${h.height}` !== size) return false;
        if (loraFilterSelected.size) {
          const has = h.loras.some((l) => loraFilterSelected.has(l.path));
          if (!has) return false;
        }
        return true;
      });
      const sort = sortSelect.value;
      if (sort === "time_asc") list = [...list].sort((a, b) => a.created_at - b.created_at);
      else if (sort === "size_desc") list = [...list].sort((a, b) => b.width * b.height - a.width * a.height);
      else if (sort === "size_asc") list = [...list].sort((a, b) => a.width * a.height - b.width * b.height);
      else list = [...list].sort((a, b) => b.created_at - a.created_at);
      return list;
    };
    const renderGallery = () => {
      const list = filtered();
      const total = allHistory.length;
      if (!total) {
        statsText.textContent = t("\u5171 0 \u5F20", "0 pictures");
      } else if (list.length === total) {
        statsText.textContent = t(`\u5171 ${total} \u5F20`, `${total} pictures`);
      } else {
        statsText.textContent = t(`\u7B5B\u9009\u51FA ${list.length} \u5F20 / \u5171 ${total} \u5F20`, `${list.length} / ${total} pictures`);
      }
      const hasFilter = !!searchInput.value.trim() || !!dateFrom.value || !!dateTo.value || !!modelSelect.value || !!sizeSelect.value || loraFilterSelected.size > 0;
      clearBtn.style.display = hasFilter ? "" : "none";
      grid.replaceChildren();
      if (!total) {
        emptyState.style.display = "flex";
        grid.style.display = "none";
        loadMoreBtn.style.display = "none";
        emptyTitle.textContent = t("\u8FD8\u6CA1\u6709\u4F5C\u54C1", "No works yet");
        emptySub.textContent = t("\u53BB\u300C\u51FA\u56FE\u300D\u9875\u753B\u4E00\u5F20\u5427", "Go to Studio and create one");
        emptyAction.replaceChildren();
        const go = ctx.ui.button(t("\u524D\u5F80\u51FA\u56FE", "Go to Studio"), { variant: "primary" });
        go.style.background = "#2ecc71";
        go.style.borderColor = "#2ecc71";
        go.style.color = "#fff";
        go.addEventListener("click", () => {
          ctx.root.dispatchEvent(new CustomEvent("coo-switch-tab", { detail: "studio", bubbles: true }));
          const m = ctx;
          if (m.switchTab) m.switchTab("studio");
        });
        emptyAction.append(go);
        dispatchUnread();
        return;
      }
      if (!list.length) {
        emptyState.style.display = "flex";
        grid.style.display = "none";
        loadMoreBtn.style.display = "none";
        emptyTitle.textContent = t("\u6CA1\u6709\u5339\u914D\u7684\u4F5C\u54C1", "No matches");
        emptySub.textContent = t("\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u6761\u4EF6", "Try adjusting filters");
        emptyAction.replaceChildren();
        const c = ctx.ui.button(t("\u6E05\u9664\u7B5B\u9009", "Clear"), { size: "sm" });
        c.addEventListener("click", () => {
          searchInput.value = "";
          dateFrom.value = "";
          dateTo.value = "";
          modelSelect.value = "";
          sizeSelect.value = "";
          loraFilterSelected.clear();
          updateLoraBtn();
          loraFilterPanel.style.display = "none";
          sortSelect.value = "time_desc";
          renderGallery();
        });
        emptyAction.append(c);
        dispatchUnread();
        return;
      }
      emptyState.style.display = "none";
      grid.style.display = "grid";
      loadMoreBtn.style.display = allHistory.length < pageLimit ? "none" : "";
      const visible = list.slice(0, loadMoreBtn.style.display === "" ? pageLimit : 2e3);
      for (const entry of visible) {
        const tile = ctx.ui.h("button", "coo-works-tile");
        tile.type = "button";
        tile.dataset.id = entry.id;
        if (activeEntry?.id === entry.id || compareA && compareA.id === entry.id || compareB && compareB.id === entry.id) tile.classList.add("sel");
        const img = ctx.ui.h("img", "");
        img.alt = entry.filename;
        img.loading = "lazy";
        img.dataset.id = entry.id;
        const label = ctx.ui.h("span", "lab", `${entry.width}\xD7${entry.height}`);
        tile.title = `${entry.filename}
${t("\u79CD\u5B50", "Seed")}: ${entry.seed}
${t("\u5C3A\u5BF8", "Size")}: ${entry.width}\xD7${entry.height}
${t("\u65F6\u95F4", "Time")}: ${shortDate(entry.created_at)}`;
        if (batchMode) {
          const chk = document.createElement("input");
          chk.type = "checkbox";
          chk.className = "chk";
          chk.checked = selected.has(entry.id);
          chk.addEventListener("click", (e) => {
            e.stopPropagation();
            if (chk.checked) selected.add(entry.id);
            else selected.delete(entry.id);
            batchCount.textContent = selected.size ? t(`\u5DF2\u9009 ${selected.size} \u5F20`, `${selected.size} selected`) : t("\u5DF2\u9009 0 \u5F20", "0 selected");
          });
          tile.append(chk);
        }
        if (!viewed.has(entry.id)) {
          const dot = ctx.ui.h("span", "coo-works-dot");
          tile.append(dot);
        }
        tile.append(img, label);
        tile.addEventListener("click", () => {
          if (batchMode) {
            if (selected.has(entry.id)) selected.delete(entry.id);
            else selected.add(entry.id);
            batchCount.textContent = selected.size ? t(`\u5DF2\u9009 ${selected.size} \u5F20`, `${selected.size} selected`) : t("\u5DF2\u9009 0 \u5F20", "0 selected");
            renderGallery();
            return;
          }
          void showDetail(entry);
        });
        grid.append(tile);
        void ctx.invokeBinary("image", [entry.id]).then((blob) => {
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          imageUrls.push(url);
          img.src = url;
        }).catch(() => {
          img.alt = "\xD7";
        });
      }
      dispatchUnread();
    };
    searchInput.addEventListener("input", renderGallery);
    dateFrom.addEventListener("change", renderGallery);
    dateTo.addEventListener("change", renderGallery);
    modelSelect.addEventListener("change", renderGallery);
    sizeSelect.addEventListener("change", renderGallery);
    sortSelect.addEventListener("change", renderGallery);
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      dateFrom.value = "";
      dateTo.value = "";
      modelSelect.value = "";
      sizeSelect.value = "";
      loraFilterSelected.clear();
      updateLoraBtn();
      loraFilterPanel.style.display = "none";
      sortSelect.value = "time_desc";
      renderGallery();
    });
    loadMoreBtn.addEventListener("click", async () => {
      pageLimit += 50;
      await fetchHistory(pageLimit);
      loadMoreBtn.style.display = allHistory.length >= pageLimit ? "" : "none";
      ctx.ui.toast(t(`\u5DF2\u52A0\u8F7D\u81F3 ${allHistory.length} \u5F20`, `Loaded ${allHistory.length}`));
    });
    batchToggle.addEventListener("click", () => {
      batchMode = !batchMode;
      batchToggle.textContent = batchMode ? t("\u9000\u51FA\u6279\u91CF", "Exit batch") : t("\u6279\u91CF\u6A21\u5F0F", "Batch");
      if (batchMode) {
        batchBar.style.display = "flex";
        previewWrap.style.display = "none";
        metaCard.style.display = "none";
        opsCard.style.display = "none";
        batchCount.textContent = t("\u5DF2\u9009 0 \u5F20", "0 selected");
      } else {
        batchBar.style.display = "none";
        metaCard.style.display = "";
        opsCard.style.display = "";
        selected.clear();
        if (activeEntry) {
          previewWrap.style.display = "block";
          void showDetail(activeEntry);
        } else {
          previewWrap.style.display = "none";
          empty.style.display = "";
        }
      }
      renderGallery();
    });
    batchDel.addEventListener("click", async () => {
      if (!selected.size) return;
      const ok = await ctx.ui.confirm({ title: t("\u6279\u91CF\u5220\u9664\uFF1F", "Delete selected?"), body: t(`\u786E\u5B9A\u5220\u9664 ${selected.size} \u5F20\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002`, `Delete ${selected.size} pictures? This cannot be undone.`), danger: true });
      if (!ok) return;
      allHistory = allHistory.filter((h) => !selected.has(h.id));
      shared.history = allHistory;
      for (const id of [...selected]) viewed.delete(id);
      saveViewed(viewed);
      selected.clear();
      batchCount.textContent = t("\u5DF2\u9009 0 \u5F20", "0 selected");
      renderGallery();
      if (activeEntry && !allHistory.some((h) => h.id === activeEntry.id)) {
        activeEntry = allHistory[0] ?? null;
        if (activeEntry) void showDetail(activeEntry);
        else {
          previewWrap.style.display = "none";
          empty.style.display = "";
          renderMeta(null);
          buildOps(null);
        }
      }
      ctx.ui.toast(t("\u5DF2\u5220\u9664", "Deleted"));
    });
    batchExport.addEventListener("click", () => {
      ctx.ui.toast(t("\u5DF2\u8BF7\u6C42\u6253\u5F00\u6587\u4EF6\u5939\uFF0C\u8BF7\u624B\u52A8\u590D\u5236", "Open folder to copy"));
      void ctx.invoke("openFolder");
    });
    batchFav.addEventListener("click", () => {
      ctx.ui.toast(t("\u5DF2\u6536\u85CF\uFF08\u672C\u5730\u6807\u8BB0\uFF09", "Favorited"));
    });
    renderGallery();
    if (activeEntry) void showDetail(activeEntry);
    else if (allHistory[0]) void showDetail(allHistory[0]);
    ctx.interval(async () => {
      if (!alive) return;
      try {
        const res = await ctx.invoke("history", [pageLimit]);
        if (!alive) return;
        if (res.history.length !== allHistory.length || res.history[0]?.id !== allHistory[0]?.id) {
          allHistory = res.history;
          shared.history = allHistory;
          refreshModelOptions();
          refreshLoraFilterOptions();
          renderGallery();
        }
      } catch {
      }
    }, 2e3);
  }
};
var lorasPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    let alive = true;
    ctx.own({ dispose: () => {
      alive = false;
    } });
    let boot;
    try {
      boot = await ctx.invoke("bootstrap");
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t("LoRA \u7BA1\u7406", "LoRA manager") });
      sheet.body.append(ctx.ui.msgline(errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;
    let loras = boot.loras;
    let defaults = [...boot.defaults];
    let aliases = { ...boot.aliases };
    let loraRoot = boot.lora_root ?? "";
    let category = "";
    const head = ctx.ui.sheet({
      title: t("LoRA \u7BA1\u7406", "LoRA manager"),
      desc: t(
        "\u626B\u63CF ComfyUI \u7684 models/loras\uFF1B\u8BBE\u5E38\u9A7B\u7EC4\u5408\u3001\u4E2D\u6587\u522B\u540D\u548C\u89E6\u53D1\u8BCD\u3002\u652F\u6301\u8BBE\u7F6E\u522B\u540D\u5206\u7C7B\u5907\u6CE8\uFF0C\u51FA\u56FE\u9875\u4F18\u5148\u663E\u793A\u522B\u540D\u3002",
        "Scans ComfyUI models/loras; set always-on defaults, aliases and trigger words. Aliases are shown first in Studio."
      )
    });
    ctx.root.append(head.el);
    const statusLine = ctx.ui.msgline("");
    const search = ctx.ui.input({ type: "search", placeholder: t("\u641C\u7D22\u540D\u79F0/\u8DEF\u5F84/\u522B\u540D/\u89E6\u53D1\u8BCD", "Search name/path/alias/trigger") });
    search.style.flex = "1";
    search.style.minWidth = "200px";
    const categorySelect = ctx.ui.select({ options: [t("\u5168\u90E8\u5206\u7C7B", "All categories")] });
    const rescan = ctx.ui.button(t("\u91CD\u65B0\u626B\u63CF", "Rescan"), { size: "sm" });
    const filterRow = ctx.ui.rowbar();
    filterRow.append(search, categorySelect, rescan);
    head.body.append(statusLine, filterRow);
    const renderStatus = () => {
      statusLine.textContent = t(
        `\u5171 ${loras.length} \u4E2A LoRA\uFF1B\u5E38\u9A7B ${defaults.length} \u4E2A${loraRoot ? ` \xB7 \u76EE\u5F55 ${loraRoot}` : " \xB7 \u6CA1\u6709\u8BBE\u7F6E ComfyUI \u6839\u76EE\u5F55\uFF0C\u9884\u89C8\u56FE/\u5206\u7C7B\u53EF\u80FD\u7F3A\u5931"}`,
        `${loras.length} LoRAs; ${defaults.length} always-on${loraRoot ? ` \xB7 ${loraRoot}` : " \xB7 no ComfyUI root set, previews/categories may be missing"}`
      );
      statusLine.classList.toggle("bad", !loraRoot);
    };
    renderStatus();
    const categories = [...new Set(loras.map((item) => item.category).filter(Boolean))].sort();
    categorySelect.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = t("\u5168\u90E8\u5206\u7C7B", "All categories");
    categorySelect.append(allOption);
    for (const item of categories) {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      categorySelect.append(option);
    }
    const table = ctx.ui.table({
      head: ["", t("LoRA", "LoRA"), t("\u522B\u540D / \u89E6\u53D1\u8BCD", "Aliases / triggers"), t("\u64CD\u4F5C", "Actions")],
      maxHeight: "calc(100vh - 330px)"
    });
    head.body.append(table.el);
    const loraUrls = [];
    ctx.own({ dispose: () => {
      for (const url of loraUrls) URL.revokeObjectURL(url);
    } });
    const loadLoraThumb = (thumb) => {
      if (!alive || thumb.dataset.loaded === "1" || !thumb.dataset.path) return;
      thumb.dataset.loaded = "1";
      void ctx.invokeBinary("loraPreview", [thumb.dataset.path]).then((blob) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        loraUrls.push(url);
        thumb.src = url;
      }).catch(() => {
        thumb.alt = "\xD7";
      });
    };
    const loraObserver = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const thumb = entry.target;
        loraObserver?.unobserve(thumb);
        loadLoraThumb(thumb);
      }
    }, { rootMargin: "160px" }) : null;
    if (loraObserver) ctx.own({ dispose: () => loraObserver.disconnect() });
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = loras.filter((item) => {
        if (category && item.category !== category) return false;
        if (!query) return true;
        return [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words].some((value) => value.toLowerCase().includes(query));
      });
      loraObserver?.disconnect();
      table.clear(filtered.length ? void 0 : t("\u6CA1\u6709\u5339\u914D\u7684 LoRA", "No matching LoRA"));
      for (const [index, record] of filtered.slice(0, 500).entries()) {
        const isDefault = defaults.some((item) => item.path === record.path);
        const thumb = ctx.ui.h("img", "coo-gen-lora-thumb");
        thumb.alt = "";
        if (record.preview) {
          thumb.dataset.path = record.path;
          thumb.loading = "lazy";
          if (loraObserver) loraObserver.observe(thumb);
          else if (index < 40) loadLoraThumb(thumb);
          thumb.addEventListener("click", () => {
            void (async () => {
              try {
                const url = await ctx.invokeBinary("loraPreview", [record.path]).then((blob) => objectUrl(ctx, blob));
                if (alive) ctx.ui.lightbox(url, record.name);
              } catch (error) {
                ctx.ui.toast(errText(error), "bad");
              }
            })();
          });
        }
        const name = document.createElement("div");
        const nameText = document.createElement("div");
        nameText.textContent = stripExt(record.name);
        nameText.title = record.path;
        const pathText = document.createElement("div");
        pathText.className = "coo-gen-sub";
        pathText.textContent = `${record.path}${record.category ? ` \xB7 ${record.category}` : ""}`;
        pathText.title = record.path;
        name.append(nameText, pathText);
        if (isDefault) name.append(pill(ctx, t("\u5E38\u9A7B", "always-on"), "on"));
        const meta = document.createElement("div");
        const aliasText = document.createElement("div");
        aliasText.textContent = record.aliases.length ? record.aliases.join(" / ") : t("\uFF08\u65E0\u522B\u540D\uFF09", "(no alias)");
        const trigText = document.createElement("div");
        trigText.className = "coo-gen-sub";
        trigText.textContent = record.trigger_words.length ? record.trigger_words.slice(0, 6).join(" / ") : t("\uFF08\u65E0\u89E6\u53D1\u8BCD\uFF09", "(no triggers)");
        meta.append(aliasText, trigText);
        const actions = ctx.ui.rowbar();
        const defaultBtn = ctx.ui.button(isDefault ? t("\u53D6\u6D88\u5E38\u9A7B", "Remove default") : t("\u8BBE\u4E3A\u5E38\u9A7B", "Make default"), {
          size: "sm",
          variant: isDefault ? "plain" : "primary"
        });
        defaultBtn.addEventListener("click", () => {
          if (isDefault) defaults = defaults.filter((item) => item.path !== record.path);
          else defaults = [...defaults, { name: record.name, path: record.path, weight: record.weight ?? 0.75, trigger_words: record.trigger_words }];
          void saveDefaults();
        });
        const aliasBtn = ctx.ui.button(t("\u522B\u540D", "Aliases"), { size: "sm" });
        aliasBtn.addEventListener("click", () => openMeta(record, "aliases"));
        const trigBtn = ctx.ui.button(t("\u89E6\u53D1\u8BCD", "Triggers"), { size: "sm" });
        trigBtn.addEventListener("click", () => openMeta(record, "trigger_words"));
        actions.append(defaultBtn, aliasBtn, trigBtn);
        table.addRow([thumb, name, meta, actions]);
      }
    };
    const openMeta = (record, key) => {
      const body = document.createElement("div");
      const line = ctx.ui.msgline(t(
        key === "aliases" ? "\u522B\u540D\u7528\u9017\u53F7\u5206\u9694\uFF1B\u5BF9\u8BDD\u91CC\u547D\u4E2D\u522B\u540D\u5C31\u4F1A\u5339\u914D\u5230\u8FD9\u4E2A LoRA\u3002" : "\u89E6\u53D1\u8BCD\u7528\u9017\u53F7\u5206\u9694\uFF1B\u7528\u6237\u8BDD\u91CC\u51FA\u73B0\u5C31\u4F1A\u5339\u914D\u3002",
        key === "aliases" ? "Separate aliases with commas; a match in chat selects this LoRA." : "Separate trigger words with commas; a mention selects this LoRA."
      ));
      const input = ctx.ui.input({ value: record[key].join(", "), cls: "mono" });
      input.style.width = "100%";
      const save = ctx.ui.button(t("\u4FDD\u5B58", "Save"), { variant: "primary" });
      body.append(line, input, save);
      const drawer = ctx.ui.drawer(`${record.name} \xB7 ${key === "aliases" ? t("\u522B\u540D", "Aliases") : t("\u89E6\u53D1\u8BCD", "Triggers")}`, body);
      save.addEventListener("click", () => {
        void (async () => {
          try {
            await ctx.invoke("setLoraMeta", [record.path, { [key]: splitList(input.value) }]);
            const res = await ctx.invoke("listLoras");
            if (!alive) return;
            loras = res.loras;
            defaults = res.defaults;
            aliases = res.aliases;
            loraRoot = res.lora_root ?? loraRoot;
            render();
            renderAliases();
            drawer.dispose();
            ctx.ui.toast(t("\u5DF2\u4FDD\u5B58", "Saved"));
          } catch (error) {
            line.textContent = errText(error);
            line.classList.add("bad");
          }
        })();
      });
    };
    const saveDefaults = async () => {
      try {
        const res = await ctx.invoke("setDefaults", [defaults]);
        if (!res.ok) throw new Error(res.error ?? "\u4FDD\u5B58\u5931\u8D25");
        defaults = res.defaults ?? defaults;
        render();
        renderDefaults();
        renderStatus();
        ctx.ui.toast(t("\u5E38\u9A7B LoRA \u5DF2\u4FDD\u5B58", "Always-on LoRAs saved"));
      } catch (error) {
        ctx.ui.toast(errText(error), "bad");
      }
    };
    search.addEventListener("input", render, { signal: ctx.signal });
    categorySelect.addEventListener("change", () => {
      category = categorySelect.value;
      render();
    });
    rescan.addEventListener("click", () => {
      void (async () => {
        try {
          const res = await ctx.invoke("refreshModels");
          if (!alive) return;
          loras = res.loras;
          loraRoot = res.lora_root ?? loraRoot;
          render();
          renderStatus();
          ctx.ui.toast(t(`\u626B\u5230 ${loras.length} \u4E2A LoRA`, `${loras.length} LoRAs`));
        } catch (error) {
          ctx.ui.toast(errText(error), "bad");
        }
      })();
    });
    const defaultSheet = ctx.ui.sheet({
      title: t("\u5E38\u9A7B\u7EC4\u5408", "Always-on stack"),
      desc: t("\u6BCF\u6B21\u51FA\u56FE\u90FD\u4F1A\u81EA\u52A8\u53E0\u52A0\uFF1B\u5BF9\u8BDD\u5339\u914D\u4F18\u5148\uFF0C\u8D85\u4E0A\u9650\u65F6\u6DD8\u6C70\u5E38\u9A7B\u3002\u53EF\u62D6\u62FD\u6392\u5E8F\uFF0C\u987A\u5E8F\u5F71\u54CD\u53E0\u52A0\u6548\u679C\u3002", "Applied to every generation; chat matches win when cap hit. Drag to reorder.")
    });
    ctx.root.append(defaultSheet.el);
    const defaultsTable = ctx.ui.table({ head: [t("LoRA", "LoRA"), t("\u6743\u91CD", "Weight"), ""] });
    defaultSheet.body.append(defaultsTable.el);
    const renderDefaults = () => {
      defaultsTable.clear(defaults.length ? void 0 : t("\u8FD8\u6CA1\u6709\u5E38\u9A7B LoRA\u3002", "No always-on LoRA yet."));
      for (const [index, item] of defaults.entries()) {
        const name = document.createElement("div");
        name.textContent = stripExt(item.name);
        const sub = document.createElement("div");
        sub.className = "coo-gen-sub";
        sub.textContent = item.path;
        name.append(sub);
        const weight = ctx.ui.input({ type: "number", value: String(item.weight), cls: "mono coo-gen-weight" });
        weight.min = "0.05";
        weight.max = "2";
        weight.step = "0.05";
        weight.addEventListener("change", () => {
          defaults[index] = { ...item, weight: Math.min(2, Math.max(0.05, num(weight.value, item.weight))) };
        });
        const remove = ctx.ui.button(t("\u79FB\u9664", "Remove"), { size: "sm", variant: "plain" });
        remove.addEventListener("click", () => {
          defaults.splice(index, 1);
          void saveDefaults();
        });
        const up = ctx.ui.button("\u2191", { size: "sm" });
        up.disabled = index === 0;
        up.addEventListener("click", () => {
          if (index > 0) {
            const tmp = defaults[index - 1];
            defaults[index - 1] = defaults[index];
            defaults[index] = tmp;
            void saveDefaults();
          }
        });
        const down = ctx.ui.button("\u2193", { size: "sm" });
        down.disabled = index === defaults.length - 1;
        down.addEventListener("click", () => {
          if (index < defaults.length - 1) {
            const tmp = defaults[index + 1];
            defaults[index + 1] = defaults[index];
            defaults[index] = tmp;
            void saveDefaults();
          }
        });
        const rowActions = ctx.ui.rowbar();
        rowActions.append(up, down, remove);
        defaultsTable.addRow([name, weight, rowActions]);
      }
    };
    renderDefaults();
    const aliasSheet = ctx.ui.sheet({
      title: t("\u522B\u540D\u8868", "Alias table"),
      desc: t("\u201C\u585E\u5C14\u8FBE\u201D \u2192 zelda_botw_style\uFF1B\u5BF9\u8BDD\u91CC\u51FA\u73B0\u4E2D\u6587\u522B\u540D\u5C31\u4F1A\u5339\u914D\u3002\u652F\u6301\u5206\u7C7B\u4E0E\u5907\u6CE8\u3002", "\u201CZelda\u201D \u2192 zelda_botw_style; a mention selects the LoRA.")
    });
    ctx.root.append(aliasSheet.el);
    const aliasTable = ctx.ui.table({ head: [t("\u522B\u540D", "Alias"), t("LoRA\uFF08\u9017\u53F7\u5206\u9694\uFF09", "LoRAs (comma separated)"), ""] });
    aliasSheet.body.append(aliasTable.el);
    const addRow = ctx.ui.rowbar();
    const newAlias = ctx.ui.input({ placeholder: t("\u65B0\u522B\u540D\uFF0C\u4F8B\u5982 \u585E\u5C14\u8FBE", "New alias, e.g. Zelda") });
    const newTargets = ctx.ui.input({ placeholder: t("\u76EE\u6807\uFF0C\u4F8B\u5982 zelda_botw_style, zelda_totk", "Targets, e.g. zelda_botw_style, zelda_totk") });
    const addAlias = ctx.ui.button(t("\u6DFB\u52A0", "Add"), { size: "sm" });
    addRow.append(newAlias, newTargets, addAlias);
    aliasSheet.body.append(addRow);
    const saveAliases = async () => {
      try {
        const res = await ctx.invoke("setAliases", [aliases]);
        if (!res.ok) throw new Error(res.error ?? "\u4FDD\u5B58\u5931\u8D25");
        aliases = res.aliases ?? aliases;
        renderAliases();
        render();
        ctx.ui.toast(t("\u522B\u540D\u8868\u5DF2\u4FDD\u5B58", "Alias table saved"));
      } catch (error) {
        ctx.ui.toast(errText(error), "bad");
      }
    };
    const renderAliases = () => {
      aliasTable.clear(Object.keys(aliases).length ? void 0 : t("\u8FD8\u6CA1\u6709\u522B\u540D\u3002", "No aliases yet."));
      for (const [alias, targets] of Object.entries(aliases)) {
        const remove = ctx.ui.button(t("\u5220\u9664", "Delete"), { size: "sm", variant: "plain" });
        remove.addEventListener("click", () => {
          delete aliases[alias];
          void saveAliases();
        });
        aliasTable.addRow([alias, targets.join(", "), remove]);
      }
    };
    addAlias.addEventListener("click", () => {
      const alias = newAlias.value.trim();
      const targets = splitList(newTargets.value);
      if (!alias || !targets.length) {
        ctx.ui.toast(t("\u522B\u540D\u548C\u76EE\u6807\u90FD\u8981\u586B", "Both alias and targets are required"), "bad");
        return;
      }
      aliases[alias] = targets;
      newAlias.value = "";
      newTargets.value = "";
      void saveAliases();
    });
    renderAliases();
    render();
    void ctx.invoke("listLoras").then(() => {
      if (alive) renderStatus();
    }).catch(() => {
    });
  }
};
var workflowsPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    let alive = true;
    ctx.own({ dispose: () => {
      alive = false;
    } });
    let presets = [];
    let defaultWorkflow = "";
    try {
      const boot = await ctx.invoke("presets");
      presets = boot.presets;
      defaultWorkflow = boot.default_workflow ?? "";
    } catch (error) {
      const sheet = ctx.ui.sheet({ title: t("\u5DE5\u4F5C\u6D41", "Workflows") });
      sheet.body.append(ctx.ui.msgline(errText(error), true));
      ctx.root.append(sheet.el);
      return;
    }
    if (!alive) return;
    const listSheet = ctx.ui.sheet({
      title: t("\u5DE5\u4F5C\u6D41", "Workflows"),
      desc: t("\u5185\u7F6E\u6587\u751F\u56FE / \u56FE\u751F\u56FE / ControlNet\uFF1B\u4E5F\u53EF\u4EE5\u5BFC\u5165 ComfyUI \u5BFC\u51FA\u7684 JSON\u3002", "Built-in txt2img / img2img / ControlNet; import a ComfyUI JSON too.")
    });
    ctx.root.append(listSheet.el);
    const table = ctx.ui.table({ head: [t("\u540D\u79F0", "Name"), t("\u7C7B\u578B", "Kind"), t("\u53C2\u6570", "Params"), t("\u64CD\u4F5C", "Actions")] });
    listSheet.body.append(table.el);
    const line = ctx.ui.msgline("");
    listSheet.body.append(line);
    const render = () => {
      table.clear(presets.length ? void 0 : t("\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u6D41", "No workflows"));
      for (const preset of presets) {
        const name = document.createElement("div");
        name.textContent = preset.name;
        const sub = document.createElement("div");
        sub.className = "coo-gen-sub";
        sub.textContent = preset.id + (preset.source ? ` \xB7 ${preset.source}` : "");
        name.append(sub);
        const kind = document.createElement("div");
        kind.textContent = preset.kind ?? (preset.builtin ? "builtin" : "imported");
        if (preset.warnings?.length) {
          kind.append(pill(ctx, t("\u6709\u63D0\u9192", "warning"), "off"));
          kind.title = preset.warnings.join("\n");
        }
        const params = document.createElement("div");
        params.textContent = String(preset.mapping_count);
        const actions = ctx.ui.rowbar();
        if (preset.id === defaultWorkflow) {
          const isDefault = ctx.ui.button(t("\u9ED8\u8BA4", "Default"), { size: "sm", variant: "primary" });
          isDefault.classList.add("coo-gen-default-btn");
          isDefault.setAttribute("aria-current", "true");
          isDefault.title = t("\u5F53\u524D\u9ED8\u8BA4\u5DE5\u4F5C\u6D41", "Current default workflow");
          isDefault.addEventListener("click", () => {
            ctx.ui.toast(t("\u8FD9\u5DF2\u7ECF\u662F\u9ED8\u8BA4\u5DE5\u4F5C\u6D41", "This is already the default workflow"));
          });
          actions.append(isDefault);
        } else {
          const use = ctx.ui.button(t("\u8BBE\u4E3A\u9ED8\u8BA4", "Use as default"), { size: "sm" });
          use.addEventListener("click", () => {
            void (async () => {
              try {
                await ctx.setConfig("world:draw-local", { "worlds.draw.localDefaultWorkflow": preset.id });
                defaultWorkflow = preset.id;
                render();
                ctx.ui.toast(t("\u5DF2\u8BBE\u4E3A\u9ED8\u8BA4\u5DE5\u4F5C\u6D41", "Default workflow saved"));
              } catch (error) {
                ctx.ui.toast(errText(error), "bad");
              }
            })();
          });
          actions.append(use);
        }
        const detail = ctx.ui.button(t("\u8BE6\u60C5", "Details"), { size: "sm" });
        detail.addEventListener("click", () => {
          void (async () => {
            try {
              const res = await ctx.invoke("presetDetail", [preset.id]);
              if (!res.ok || !res.preset) throw new Error(res.error ?? "\u8BFB\u53D6\u5931\u8D25");
              const body = document.createElement("div");
              const mapping = ctx.ui.table({ head: ["param", "node", "field", "type"] });
              for (const item of res.preset.mapping) {
                mapping.addRow([item.param, item.node_id, item.field, item.ui_type]);
              }
              body.append(mapping.el);
              if (res.preset.warnings.length) body.append(ctx.ui.msgline(res.preset.warnings.join("\uFF1B"), true));
              ctx.ui.drawer(res.preset.name, body);
            } catch (error) {
              ctx.ui.toast(errText(error), "bad");
            }
          })();
        });
        actions.append(detail);
        if (!preset.builtin) {
          const remove = ctx.ui.button(t("\u5220\u9664", "Delete"), { size: "sm", variant: "danger" });
          remove.addEventListener("click", () => {
            void (async () => {
              const ok = await ctx.ui.confirm({ title: t("\u5220\u9664\u5DE5\u4F5C\u6D41\uFF1F", "Delete workflow?"), body: preset.name, danger: true });
              if (!ok) return;
              try {
                await ctx.invoke("removePreset", [preset.id]);
                presets = presets.filter((item) => item.id !== preset.id);
                render();
                ctx.ui.toast(t("\u5DF2\u5220\u9664", "Deleted"));
              } catch (error) {
                ctx.ui.toast(errText(error), "bad");
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
      title: t("\u5BFC\u5165\u5DE5\u4F5C\u6D41", "Import workflow"),
      desc: t("\u652F\u6301 ComfyUI \u7684 API \u683C\u5F0F\uFF0C\u4E5F\u4F1A\u628A UI \u683C\u5F0F\u6309 /object_info \u81EA\u52A8\u8F6C\u6362\uFF1B\u53C2\u6570\u4F1A\u81EA\u52A8\u8BC6\u522B\u3002", "Accepts API format; UI format is converted with /object_info. Parameters are auto-detected.")
    });
    ctx.root.append(importSheet.el);
    const pathRow = ctx.ui.rowbar();
    const pathInput = ctx.ui.input({ cls: "mono", placeholder: t("ComfyUI \u5BFC\u51FA\u7684 .json \u7EDD\u5BF9\u8DEF\u5F84", "Absolute path to the exported .json") });
    pathInput.style.flex = "1";
    pathInput.style.minWidth = "240px";
    const pick = ctx.ui.button(t("\u9009\u62E9\u2026", "Choose\u2026"), { size: "sm" });
    pick.addEventListener("click", () => {
      void (async () => {
        try {
          const picked = await ctx.pickPath({ kind: "file", extensions: ["json"] });
          if (picked) pathInput.value = picked;
        } catch (error) {
          line.textContent = errText(error);
          line.classList.add("bad");
        }
      })();
    });
    const nameInput = ctx.ui.input({ placeholder: t("\u540D\u79F0\uFF08\u7559\u7A7A\u7528\u6587\u4EF6\u540D\uFF09", "Name (defaults to file name)") });
    nameInput.style.width = "100%";
    const importBtn = ctx.ui.button(t("\u5BFC\u5165", "Import"), { variant: "primary", size: "sm" });
    pathRow.append(pathInput, pick, importBtn);
    importSheet.body.append(pathRow, ctx.ui.field(t("\u540D\u79F0", "Name"), nameInput));
    importBtn.addEventListener("click", () => {
      const path = pathInput.value.trim();
      if (!path) {
        line.textContent = t("\u5148\u586B JSON \u8DEF\u5F84\u3002", "Enter the JSON path first.");
        line.classList.add("bad");
        return;
      }
      void (async () => {
        importBtn.disabled = true;
        line.classList.remove("bad");
        line.textContent = t("\u6B63\u5728\u5BFC\u5165\u2026", "Importing\u2026");
        try {
          const res = await ctx.invoke("importWorkflow", [path, nameInput.value.trim()]);
          if (!alive) return;
          if (!res.ok || !res.preset) throw new Error(res.error ?? "\u5BFC\u5165\u5931\u8D25");
          presets = [res.preset, ...presets];
          render();
          line.textContent = t(
            `\u5DF2\u5BFC\u5165\u300C${res.preset.name}\u300D\uFF0C\u8BC6\u522B\u5230 ${res.preset.mapping_count} \u4E2A\u53C2\u6570${res.warnings?.length ? `\uFF1B${res.warnings.join("\uFF1B")}` : ""}`,
            `Imported \u201C${res.preset.name}\u201D with ${res.preset.mapping_count} parameters${res.warnings?.length ? `; ${res.warnings.join("; ")}` : ""}`
          );
          line.classList.toggle("bad", Boolean(res.warnings?.length));
          ctx.ui.toast(t("\u5DE5\u4F5C\u6D41\u5DF2\u5BFC\u5165", "Workflow imported"));
        } catch (error) {
          line.textContent = errText(error);
          line.classList.add("bad");
        } finally {
          importBtn.disabled = false;
        }
      })();
    });
  }
};

// src/api/config.ts
var PET_DRAW_DEFAULTS = {
  enabled: false,
  style: "crayon",
  customStyle: "",
  dailyLimit: 20,
  maxImagesPerCall: 1,
  cooldownSeconds: 20,
  saveDir: "",
  budgetCny: 0,
  popupEnabled: true,
  popupSeconds: 5,
  popupScale: 1,
  referenceSearch: true,
  referenceScreen: true
};
var PET_DRAW_CONFIG_GROUP = {
  id: "world:pet-draw",
  owner: "world:pet-draw",
  schema: {
    type: "object",
    title: "\u7ED8\u753B",
    description: "\u684C\u5BA0\u6309\u81EA\u5DF1\u7684\u4EBA\u8BBE\u753B\u5C0F\u753B\u3002\u56FE\u7247\u56FA\u5B9A 512\xD7512\uFF1B\u4E0D\u751F\u6210\u89C6\u9891\u3001\u9AD8\u6E05\u56FE\u6216\u5199\u5B9E\u7167\u7247\u3002API Key \u53EA\u4ECE\u90E8\u7F72\u7684 .env \u8BFB\u53D6\uFF0C\u4E0D\u5199\u8FDB config.json\u3002",
    properties: {
      "worlds.pet-draw.style": {
        type: "string",
        title: "\u753B\u98CE",
        description: "\u5B9E\u9645\u4F7F\u7528\u7684\u753B\u98CE\uFF1B\u56FA\u5B9A\u540E\u4E0D\u4F1A\u56E0\u4E3A\u522B\u4EBA\u8981\u6C42\u5C31\u6362\u98CE\u683C\u3002\u4EBA\u8BBE\u540D\u5B57/\u6027\u683C\u4ECD\u4ECE\u57FA\u7840\u8BBE\u5B9A\u8BFB\u3002",
        enum: ["crayon", "pencil", "marker", "ink", "charcoal", "pen", "pixel", "custom"],
        "x-options": "pet-draw-style",
        "x-hot": true,
        "x-section": "\u98CE\u683C\u4E0E\u753B\u6CD5",
        "x-help": "\u8721\u7B14\u6D82\u9E26 / \u94C5\u7B14\u901F\u5199 \u7B49\u4E3A\u9884\u8BBE\u98CE\u683C\uFF1B\u9009\u201C\u81EA\u5B9A\u4E49\u201D\u540E\u4E0B\u65B9\u8BF4\u660E\u751F\u6548\u3002"
      },
      "worlds.pet-draw.customStyle": {
        type: "string",
        title: "\u81EA\u5B9A\u4E49\u753B\u98CE\u8BF4\u660E",
        description: "\u753B\u98CE\u9009\u201C\u81EA\u5B9A\u4E49\u201D\u65F6\u4F7F\u7528\uFF1B\u5199\u6210\u4E00\u6BB5\u753B\u98CE\u8BF4\u660E\uFF0C\u6700\u591A 600 \u5B57\u3002\u7559\u7A7A\u4F1A\u9000\u56DE\u8721\u7B14\u6D82\u9E26\u3002",
        "x-hot": true,
        "x-section": "\u98CE\u683C\u4E0E\u753B\u6CD5",
        "x-dependsOn": "worlds.pet-draw.style",
        "x-dependsValue": "custom"
      },
      "worlds.pet-draw.dailyLimit": {
        type: "integer",
        title: "\u6BCF\u5929\u6700\u591A\u753B\u51E0\u5F20",
        description: "0 \u8868\u793A\u4E0D\u9650\u3002\u5230\u4E0A\u9650\u540E\u5F53\u5929\u4E0D\u518D\u8C03\u7528\uFF0C\u56DE\u6267\u662F [skipped]\u3002",
        minimum: 0,
        maximum: 200,
        "x-hot": true,
        "x-section": "\u914D\u989D\u4E0E\u9650\u5236",
        "x-unit": "\u5F20"
      },
      "worlds.pet-draw.maxImagesPerCall": {
        type: "integer",
        title: "\u6BCF\u6B21\u6700\u591A\u51FA\u51E0\u5F20",
        description: "1\u20134\u3002pet_draw \u7684 count \u4F1A\u88AB\u5939\u5230\u8FD9\u4E2A\u4E0A\u9650\uFF1B\u9ED8\u8BA4 1\u3002",
        minimum: 1,
        maximum: 4,
        "x-hot": true,
        "x-section": "\u914D\u989D\u4E0E\u9650\u5236",
        "x-unit": "\u5F20"
      },
      "worlds.pet-draw.saveDir": {
        type: "string",
        title: "\u753B\u5939\u76EE\u5F55",
        description: "\u7559\u7A7A\u65F6\u4F7F\u7528\u9ED8\u8BA4\u76EE\u5F55\uFF08\u6570\u636E\u76EE\u5F55\u4E0B\u7684 pet-draw\uFF09\u3002",
        "x-path": { kind: "directory" },
        "x-hot": true,
        "x-section": "\u5B58\u50A8",
        "x-help": "\u753B\u597D\u7684\u56FE\u6309\u8BC4\u4EF7\u5B58\u8FDB\u8FD9\u91CC\uFF08unrated / favorite / like / neutral / dislike\uFF09\uFF0C\u5E76\u5199\u4E00\u4EFD index.json \u7ED9\u5176\u4ED6\u63D2\u4EF6\u8BFB\u3002"
      },
      "worlds.pet-draw.budgetCny": {
        type: "number",
        title: "\u6708\u5EA6\u753B\u56FE\u9884\u7B97\uFF08\u5143\uFF09",
        description: "0 = \u4E0D\u8BBE\u3002\u53EA\u7528\u6765\u628A\u9884\u7B97\u6298\u7B97\u6210\u201C\u8FD8\u80FD\u753B\u5927\u7EA6\u51E0\u5F20\u201D\u3002",
        minimum: 0,
        maximum: 1e5,
        "x-suffix": "\u5143",
        "x-hot": true,
        "x-section": "\u914D\u989D\u4E0E\u9650\u5236"
      },
      "worlds.pet-draw.popupEnabled": {
        type: "boolean",
        title: "\u753B\u5B8C\u81EA\u52A8\u5E26\u56FE",
        description: "\u753B\u597D\u540E\u628A\u7B2C\u4E00\u5F20\u653E\u8FDB\u684C\u5BA0\u5934\u9876\u7684\u6C14\u6CE1\u3002",
        "x-hot": true,
        "x-section": "\u6C14\u6CE1\u5C55\u793A"
      },
      "worlds.pet-draw.popupSeconds": {
        type: "integer",
        title: "\u6C14\u6CE1\u505C\u7559\uFF08\u79D2\uFF09",
        description: "1\u201330\uFF0C\u9ED8\u8BA4 5\u3002",
        minimum: 1,
        maximum: 30,
        "x-hot": true,
        "x-section": "\u6C14\u6CE1\u5C55\u793A",
        "x-unit": "\u79D2"
      },
      "worlds.pet-draw.popupScale": {
        type: "number",
        title: "\u6C14\u6CE1\u5C3A\u5BF8\u7F29\u653E",
        description: "0.3\u20132\uFF0C\u9ED8\u8BA4 1\u3002",
        minimum: 0.3,
        maximum: 2,
        "x-hot": true,
        "x-section": "\u6C14\u6CE1\u5C55\u793A"
      },
      "worlds.pet-draw.referenceSearch": {
        type: "boolean",
        title: "\u5141\u8BB8\u641C\u56FE\u53C2\u8003",
        description: "\u73A9\u5BB6\u70B9\u540D\u4EBA\u7269\u65F6\uFF0C\u8054\u7F51\u641C\u4E00\u5F20\u53C2\u8003\u56FE\u3002",
        "x-hot": true,
        "x-section": "\u53C2\u8003\u56FE"
      },
      "worlds.pet-draw.referenceScreen": {
        type: "boolean",
        title: "\u5141\u8BB8\u622A\u56FE\u53C2\u8003",
        description: "\u73A9\u5BB6\u8BF4\u201C\u7528\u5C4F\u5E55/\u622A\u56FE\u201D\u65F6\uFF0C\u622A\u5F53\u524D\u4E3B\u5C4F\u4F5C\u53C2\u8003\u3002",
        "x-hot": true,
        "x-section": "\u53C2\u8003\u56FE"
      },
      "worlds.pet-draw.cooldownSeconds": {
        type: "integer",
        title: "\u4E24\u6B21\u753B\u56FE\u7684\u6700\u5C0F\u95F4\u9694\uFF08\u79D2\uFF09",
        description: "0 \u8868\u793A\u4E0D\u9650\u3002\u51B7\u5374\u671F\u5185\u56DE\u6267\u662F [skipped]\u3002",
        minimum: 0,
        maximum: 3600,
        "x-hot": true,
        "x-section": "\u914D\u989D\u4E0E\u9650\u5236",
        "x-unit": "\u79D2"
      }
    }
  }
};

// src/local/config.ts
var COO_GEN_DEFAULTS = {
  enabled: false,
  url: "http://127.0.0.1:8188",
  comfyDir: "",
  modelsDir: "",
  autoLaunch: false,
  launchScript: "",
  launchArgs: "",
  stopScript: "",
  launchCwd: "",
  launchWaitSeconds: 60,
  outputDir: "",
  defaultCheckpoint: "",
  loraMaxCount: 3,
  historyLimit: 50,
  sampler: "euler_ancestral",
  scheduler: "normal",
  steps: 20,
  cfg: 7,
  width: 768,
  height: 1152,
  batch: 1,
  negativePrompt: "low quality, blurry, bad anatomy",
  promptPrefix: "masterpiece, best quality",
  promptSuffix: "",
  translateUrl: "",
  translateModel: "",
  translateKeyEnv: "COO_GEN_LLM_KEY",
  translateTimeoutSeconds: 12,
  timeoutSeconds: 300,
  pollSeconds: 2,
  popupEnabled: true,
  popupSeconds: 6,
  popupScale: 0.8,
  defaultWorkflow: "quick-txt2img"
};
var SAMPLERS = [
  "euler_ancestral",
  "euler",
  "heun",
  "dpm_2",
  "dpm_2_ancestral",
  "lms",
  "dpmpp_2s_ancestral",
  "dpmpp_sde",
  "dpmpp_2m",
  "dpmpp_2m_sde",
  "dpmpp_3m_sde",
  "ddim",
  "uni_pc"
];
var SCHEDULERS = [
  "normal",
  "karras",
  "exponential",
  "sgm_uniform",
  "simple",
  "ddim_uniform",
  "beta"
];
var COO_GEN_CONFIG_GROUP = {
  id: "world:coo-gen",
  owner: "world:coo-gen",
  schema: {
    type: "object",
    title: "\u51FA\u56FE",
    description: "\u7528\u672C\u5730 ComfyUI \u51FA\u7528\u6237\u81EA\u5DF1\u7684\u56FE\u3002\u8FD9\u91CC\u53EA\u653E\u8FDE\u63A5\u548C\u9ED8\u8BA4\u503C\uFF1BLoRA \u5E38\u9A7B\u7EC4\u5408\u3001\u522B\u540D\u548C\u9ED8\u8BA4\u53C2\u6570\u5728\u300C\u51FA\u56FE\u300D\u9762\u677F\u91CC\u7BA1\u7406\u3002",
    properties: {
      "worlds.coo-gen.url": {
        type: "string",
        title: "ComfyUI \u5730\u5740",
        description: "\u9ED8\u8BA4 http://127.0.0.1:8188\u3002\u9762\u677F\u4F1A\u5B9E\u65F6\u68C0\u6D4B /system_stats\u3002",
        "x-hot": true,
        "x-section": "\u8FDE\u63A5\u4E0E\u8DEF\u5F84"
      },
      "worlds.coo-gen.comfyDir": {
        type: "string",
        title: "ComfyUI \u6839\u76EE\u5F55",
        description: "\u5305\u542B main.py \u548C models \u7684\u90A3\u5C42\uFF0C\u4F8B\u5982 D:\\develop\\ComfyUI\\ComfyUI\u3002\u7528\u6765\u627E ComfyUI \u81EA\u5DF1\u7684 models \u548C extra_model_paths.yaml\u3002",
        "x-path": { kind: "directory" },
        "x-hot": true,
        "x-section": "\u8FDE\u63A5\u4E0E\u8DEF\u5F84"
      },
      "worlds.coo-gen.modelsDir": {
        type: "string",
        title: "\u6A21\u578B\u6839\u76EE\u5F55",
        description: "\u72EC\u7ACB\u7684\u6A21\u578B\u6587\u4EF6\u5939\uFF0C\u4F8B\u5982 D:\\develop\\ComfyUI\\models\u3002\u91CC\u9762\u653E checkpoints/\u3001loras/\u3001diffusion_models/\uFF1B\u7559\u7A7A\u65F6\u7528 ComfyUI \u6839\u76EE\u5F55\u4E0B\u7684 models\u3002\u63D2\u4EF6\u4F1A\u4ECE\u8FD9\u91CC\u626B\u63CF\u6A21\u578B\uFF0C\u5E76\u53EF\u901A\u8FC7\u9762\u677F\u5199\u5165 extra_model_paths.yaml \u8BA9 ComfyUI \u4E5F\u8BFB\u53D6\u3002",
        "x-path": { kind: "directory" },
        "x-hot": true,
        "x-section": "\u8FDE\u63A5\u4E0E\u8DEF\u5F84"
      },
      "worlds.coo-gen.outputDir": {
        type: "string",
        title: "\u51FA\u56FE\u4FDD\u5B58\u76EE\u5F55",
        description: "\u7559\u7A7A\u65F6\u4F7F\u7528\u9ED8\u8BA4\u76EE\u5F55\uFF08\u6570\u636E\u76EE\u5F55\u4E0B\u7684 output\uFF09\u3002",
        "x-path": { kind: "directory" },
        "x-hot": true,
        "x-section": "\u8FDE\u63A5\u4E0E\u8DEF\u5F84"
      },
      "worlds.coo-gen.defaultCheckpoint": {
        type: "string",
        title: "\u9ED8\u8BA4\u6A21\u578B",
        description: "ComfyUI \u7684 checkpoint \u6587\u4EF6\u540D\uFF1B\u9762\u677F\u91CC\u53EF\u4EE5\u6539\u3002\u7559\u7A7A\u65F6\u7528\u5217\u8868\u7B2C\u4E00\u4E2A\u3002",
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.loraMaxCount": {
        type: "integer",
        title: "LoRA \u6700\u591A\u53E0\u52A0\u6570",
        description: "1\u20135\uFF0C\u9ED8\u8BA4 3\u3002\u5BF9\u8BDD\u5339\u914D\u4F18\u5148\u4E8E\u9ED8\u8BA4 LoRA\uFF1B\u8D85\u9650\u65F6\u6DD8\u6C70\u9ED8\u8BA4\u3002",
        minimum: 1,
        maximum: 5,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.historyLimit": {
        type: "integer",
        title: "\u9762\u677F\u5386\u53F2\u6761\u6570",
        description: "1\u2013200\uFF0C\u9ED8\u8BA4 50\u3002\u53EA\u5F71\u54CD\u9762\u677F\u4E0E\u5386\u53F2\u7D22\u5F15\uFF0C\u4E0D\u5220\u56FE\u3002",
        minimum: 1,
        maximum: 200,
        "x-hot": true,
        "x-section": "\u8FD0\u884C\u65F6"
      },
      "worlds.coo-gen.sampler": {
        type: "string",
        title: "\u9ED8\u8BA4\u91C7\u6837\u5668",
        description: "\u65B0\u4EFB\u52A1\u9ED8\u8BA4\u4F7F\u7528\uFF1B\u9762\u677F\u91CC\u53EF\u4EE5\u6539\u3002",
        enum: [...SAMPLERS],
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.scheduler": {
        type: "string",
        title: "\u9ED8\u8BA4\u8C03\u5EA6\u5668",
        enum: [...SCHEDULERS],
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.steps": {
        type: "integer",
        title: "\u9ED8\u8BA4\u6B65\u6570",
        description: "1\u2013100\uFF0C\u9ED8\u8BA4 20\u3002",
        minimum: 1,
        maximum: 100,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.cfg": {
        type: "number",
        title: "\u9ED8\u8BA4 CFG",
        description: "1\u201330\uFF0C\u9ED8\u8BA4 7\u3002",
        minimum: 1,
        maximum: 30,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.width": {
        type: "integer",
        title: "\u9ED8\u8BA4\u5BBD\u5EA6",
        description: "64\u20134096\uFF0C\u9ED8\u8BA4 768\u3002",
        minimum: 64,
        maximum: 4096,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.height": {
        type: "integer",
        title: "\u9ED8\u8BA4\u9AD8\u5EA6",
        description: "64\u20134096\uFF0C\u9ED8\u8BA4 1152\u3002",
        minimum: 64,
        maximum: 4096,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.batch": {
        type: "integer",
        title: "\u9ED8\u8BA4\u6279\u6B21",
        description: "1\u20138\uFF0C\u9ED8\u8BA4 1\u3002",
        minimum: 1,
        maximum: 8,
        "x-hot": true,
        "x-section": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570"
      },
      "worlds.coo-gen.negativePrompt": {
        type: "string",
        title: "\u9ED8\u8BA4\u53CD\u5411\u63D0\u793A\u8BCD",
        description: "\u9762\u677F\u91CC\u53EF\u6539\uFF1B\u5BF9\u8BDD\u89E6\u53D1\u51FA\u56FE\u65F6\u4E5F\u7528\u5B83\u3002",
        "x-hot": true,
        "x-section": "\u63D0\u793A\u8BCD\u9ED8\u8BA4"
      },
      "worlds.coo-gen.promptPrefix": {
        type: "string",
        title: "\u6B63\u5411\u63D0\u793A\u8BCD\u524D\u7F00",
        description: "\u6BCF\u6B21\u51FA\u56FE\u81EA\u52A8\u52A0\u5728\u6700\u524D\u9762\uFF1B\u7559\u7A7A\u4E0D\u52A0\u3002",
        "x-hot": true,
        "x-section": "\u63D0\u793A\u8BCD\u9ED8\u8BA4"
      },
      "worlds.coo-gen.promptSuffix": {
        type: "string",
        title: "\u6B63\u5411\u63D0\u793A\u8BCD\u540E\u7F00",
        description: "\u6BCF\u6B21\u51FA\u56FE\u81EA\u52A8\u52A0\u5728\u6700\u540E\u9762\uFF1B\u7559\u7A7A\u4E0D\u52A0\u3002",
        "x-hot": true,
        "x-section": "\u63D0\u793A\u8BCD\u9ED8\u8BA4"
      },
      "worlds.coo-gen.translateUrl": {
        type: "string",
        title: "\u7FFB\u8BD1\u7AEF\u70B9\uFF08\u53EF\u9009\uFF09",
        description: "OpenAI \u517C\u5BB9\u7684 /v1/chat/completions \u5730\u5740\uFF0C\u4F8B\u5982 http://127.0.0.1:11434/v1\u3002\u7559\u7A7A\u65F6\u53EA\u7528\u8BCD\u5178\u548C\u8C03\u7528\u65B9\u7ED9\u7684\u82F1\u6587 tag\u3002",
        "x-hot": true,
        "x-section": "\u7FFB\u8BD1"
      },
      "worlds.coo-gen.translateModel": {
        type: "string",
        title: "\u7FFB\u8BD1\u6A21\u578B",
        description: "\u4F8B\u5982 qwen2.5:7b\uFF1B\u7559\u7A7A\u5219\u4E0D\u5F00\u7FFB\u8BD1\u3002",
        "x-hot": true,
        "x-section": "\u7FFB\u8BD1"
      },
      "worlds.coo-gen.translateKeyEnv": {
        type: "string",
        title: "\u7FFB\u8BD1 Key \u7684\u73AF\u5883\u53D8\u91CF\u540D",
        description: "\u9ED8\u8BA4 COO_GEN_LLM_KEY\uFF1B\u672C\u5730\u7AEF\u70B9\u901A\u5E38\u4E0D\u9700\u8981\uFF0C\u7559\u7A7A\u5373\u53EF\u3002",
        "x-hot": true,
        "x-section": "\u7FFB\u8BD1"
      },
      "worlds.coo-gen.translateTimeoutSeconds": {
        type: "integer",
        title: "\u7FFB\u8BD1\u8D85\u65F6\uFF08\u79D2\uFF09",
        description: "3\u201360\uFF0C\u9ED8\u8BA4 12\u3002\u8D85\u65F6\u540E\u539F\u6587\u76F4\u63A5\u4F5C\u4E3A prompt\u3002",
        minimum: 3,
        maximum: 60,
        "x-hot": true,
        "x-section": "\u7FFB\u8BD1"
      },
      "worlds.coo-gen.timeoutSeconds": {
        type: "integer",
        title: "\u5355\u6B21\u51FA\u56FE\u8D85\u65F6\uFF08\u79D2\uFF09",
        description: "30\u20131800\uFF0C\u9ED8\u8BA4 300\uFF1B\u8D85\u65F6\u540E\u4EFB\u52A1\u6807\u8BB0\u4E3A\u5931\u8D25\u5E76\u63D0\u793A\u53D6\u6D88\u3002",
        minimum: 30,
        maximum: 1800,
        "x-hot": true,
        "x-section": "\u8FD0\u884C\u65F6"
      },
      "worlds.coo-gen.pollSeconds": {
        type: "integer",
        title: "\u8F6E\u8BE2\u95F4\u9694\uFF08\u79D2\uFF09",
        description: "1\u201310\uFF0C\u9ED8\u8BA4 2\uFF1BWebSocket \u65AD\u7EBF\u65F6\u9760\u5B83\u67E5 /history\u3002",
        minimum: 1,
        maximum: 10,
        "x-hot": true,
        "x-section": "\u8FD0\u884C\u65F6"
      },
      "worlds.coo-gen.popupEnabled": {
        type: "boolean",
        title: "\u753B\u5B8C\u81EA\u52A8\u5F39\u7B2C\u4E00\u5F20",
        description: "\u5F39\u5728\u684C\u5BA0\u5934\u9876\u7684\u6C14\u6CE1\u91CC\uFF1B\u684C\u5BA0\u6CA1\u5F00\u65F6\u53EA\u7559\u5BF9\u8BDD\u9875\u548C\u9762\u677F\u3002",
        "x-hot": true,
        "x-section": "\u81EA\u52A8\u5316"
      },
      "worlds.coo-gen.popupSeconds": {
        type: "integer",
        title: "\u6C14\u6CE1\u505C\u7559\uFF08\u79D2\uFF09",
        description: "1\u201330\uFF0C\u9ED8\u8BA4 6\u3002",
        minimum: 1,
        maximum: 30,
        "x-hot": true,
        "x-section": "\u81EA\u52A8\u5316"
      },
      "worlds.coo-gen.popupScale": {
        type: "number",
        title: "\u6C14\u6CE1\u5C3A\u5BF8\u7F29\u653E",
        description: "0.3\u20132\uFF0C\u9ED8\u8BA4 0.8\u3002",
        minimum: 0.3,
        maximum: 2,
        "x-hot": true,
        "x-section": "\u81EA\u52A8\u5316"
      },
      "worlds.coo-gen.defaultWorkflow": {
        type: "string",
        title: "\u9ED8\u8BA4\u5DE5\u4F5C\u6D41",
        description: "\u5185\u7F6E quick-txt2img / img2img / controlnet\uFF0C\u6216\u5BFC\u5165\u5DE5\u4F5C\u6D41\u7684 id\u3002",
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.launchScript": {
        type: "string",
        title: "ComfyUI \u542F\u52A8\u811A\u672C",
        description: "\u4E00\u952E\u542F\u52A8\u7528\u7684 .bat / .cmd / .exe / .py\uFF1B\u7559\u7A7A\u5219\u4E0D\u63D0\u4F9B\u4E00\u952E\u542F\u52A8\u3002",
        "x-path": { kind: "file", extensions: [".bat", ".cmd", ".exe", ".py", ".ps1"] },
        "x-warning": true,
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.launchArgs": {
        type: "string",
        title: "\u542F\u52A8\u53C2\u6570",
        description: "\u4F8B\u5982 --port 8188\uFF1B\u652F\u6301\u53CC\u5F15\u53F7\u3002\u7528 start_coo-gen \u811A\u672C\u65F6\u7559\u7A7A\u5373\u53EF\uFF0C\u811A\u672C\u4F1A\u81EA\u5DF1\u5E26\u7AEF\u53E3\u3002",
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.stopScript": {
        type: "string",
        title: "ComfyUI \u5173\u95ED\u811A\u672C",
        description: "\u4E00\u952E\u5173\u95ED\u7528\u7684 .bat / .cmd / .exe / .ps1\uFF1B\u7559\u7A7A\u5219\u9762\u677F\u548C\u5BF9\u8BDD\u90FD\u4E0D\u63D0\u4F9B\u5173\u95ED\u3002",
        "x-path": { kind: "file", extensions: [".bat", ".cmd", ".exe", ".ps1"] },
        "x-warning": true,
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.launchCwd": {
        type: "string",
        title: "\u542F\u52A8\u5DE5\u4F5C\u76EE\u5F55",
        description: "\u7559\u7A7A\u65F6\u7528\u811A\u672C\u6240\u5728\u76EE\u5F55\u3002",
        "x-path": { kind: "directory" },
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.launchWaitSeconds": {
        type: "integer",
        title: "\u542F\u52A8\u7B49\u5F85\uFF08\u79D2\uFF09",
        description: "10\u2013300\uFF0C\u9ED8\u8BA4 60\uFF1B\u671F\u95F4\u6BCF 1.5 \u79D2\u63A2\u6D4B\u4E00\u6B21\u3002",
        minimum: 10,
        maximum: 300,
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      },
      "worlds.coo-gen.autoLaunch": {
        type: "boolean",
        title: "\u63D2\u4EF6\u542F\u52A8\u65F6\u81EA\u52A8\u62C9\u8D77 ComfyUI",
        description: "\u53EA\u5728\u914D\u7F6E\u4E86\u542F\u52A8\u811A\u672C\u65F6\u751F\u6548\uFF1B\u4E0D\u4F1A\u91CD\u590D\u542F\u52A8\u5DF2\u7ECF\u5728\u8FD0\u884C\u7684\u5B9E\u4F8B\u3002",
        "x-hot": true,
        "x-section": "\u542F\u52A8\u4E0E\u5173\u95ED"
      }
    }
  }
};

// src/config.ts
var capitalize = (key) => key.charAt(0).toUpperCase() + key.slice(1);
function prefixedLocalDefaults() {
  const out = {};
  for (const [key, value] of Object.entries(COO_GEN_DEFAULTS)) {
    if (key === "enabled") continue;
    out[`local${capitalize(key)}`] = value;
  }
  return out;
}
var LOCAL_DEFAULTS = prefixedLocalDefaults();
var DRAW_DEFAULTS = {
  ...PET_DRAW_DEFAULTS,
  ...LOCAL_DEFAULTS,
  routePet: "api",
  routeDiary: "api",
  personaWorkflow: "persona-krea2",
  personaUnet: "krea2_turbo_nvfp4.safetensors",
  personaClip: "qwen3vl_4b_fp8_scaled.safetensors",
  personaVae: "qwen_image_vae.safetensors",
  personaSteps: 8,
  personaCfg: 1,
  personaSampler: "euler",
  personaScheduler: "simple",
  personaLoras: "",
  personaNegative: "\u7167\u7247, \u5199\u5B9E, 3D, \u9AD8\u6E05, \u6444\u5F71, \u7C97\u7CD9, \u6587\u5B57, \u6C34\u5370, \u7B7E\u540D, \u8FB9\u6846",
  personaExtraPrompt: "",
  personaReferenceMode: "describe",
  personaImg2imgDenoise: 0.55
};
function remapGroup(group, oldPrefix, mapKey, overrides) {
  const properties = {};
  for (const [path, prop] of Object.entries(group.schema.properties)) {
    const short = path.startsWith(oldPrefix) ? path.slice(oldPrefix.length) : path;
    properties[mapKey(short)] = prop;
  }
  return {
    id: overrides.id,
    owner: "world:draw",
    schema: {
      type: "object",
      title: overrides.title,
      ...overrides.description ? { description: overrides.description } : {},
      properties
    }
  };
}
var ROUTE_PROPERTIES = {
  "worlds.draw.routePet": {
    type: "string",
    title: "\u684C\u5BA0\u4E3B\u52A8\u753B\u7528\u54EA\u79CD\u753B\u6CD5",
    "x-section": "\u8DEF\u7531",
    description: "\u94C3\u5170\u81EA\u5DF1\u60F3\u753B\u3001\u6216\u4F60\u8BA9\u5979\u753B\u4E00\u5F20\u65F6\u8D70\u8FD9\u8FB9\u3002API = \u5343\u95EE 512 \u5C0F\u753B\uFF1B\u672C\u5730 = \u4F60\u7684 ComfyUI\uFF0C\u6309\u300C\u4EBA\u8BBE\u7B14\u89E6\u300D\u9884\u8BBE\u51FA\u56FE\u3002\u9009\u54EA\u79CD\u5C31\u7528\u54EA\u79CD\uFF0C\u4E0D\u53EF\u7528\u65F6\u62A5\u9519\uFF0C\u4E0D\u4F1A\u5077\u5077\u6362\u3002",
    enum: ["api", "local"],
    "x-options": "draw-route",
    "x-hot": true
  },
  "worlds.draw.routeDiary": {
    type: "string",
    title: "\u65E5\u8BB0\u914D\u56FE\u7528\u54EA\u79CD\u753B\u6CD5",
    "x-section": "\u8DEF\u7531",
    description: "\u5199\u65E5\u8BB0\u65F6\u73B0\u753B\u4E00\u5F20\u8D70\u8FD9\u8FB9\u3002\u65E0\u8BBA API \u8FD8\u662F\u672C\u5730\uFF0C\u90FD\u6309\u4EBA\u8BBE\u7B14\u89E6\u51FA\u56FE\uFF1B\u672C\u5730\u4E0D\u4F1A\u5957\u7528\u4F60\u5DE5\u4F5C\u5BA4\u7684\u6A21\u578B/LoRA\u3002",
    enum: ["api", "local"],
    "x-options": "draw-route",
    "x-hot": true
  }
};
var apiProperties = remapGroup(
  PET_DRAW_CONFIG_GROUP,
  "worlds.pet-draw.",
  (short) => `worlds.draw.${short}`,
  {
    id: "world:draw",
    title: "\u7ED8\u56FE \xB7 \u901A\u7528\u4E0E API",
    description: "\u753B\u98CE\u3001\u914D\u989D\u3001\u753B\u5939\u548C\u53C2\u8003\u56FE\u662F API \u7ED8\u753B\u4E0E\u672C\u5730\u4EBA\u8BBE\u51FA\u56FE\u5171\u7528\u7684\u4EBA\u8BBE\u8BBE\u5B9A\u3002API Key \u53EA\u4ECE\u90E8\u7F72 .env \u8BFB\u53D6\uFF0C\u4E0D\u5199\u8FDB config.json\u3002"
  }
).schema.properties;
var DRAW_CONFIG_GROUP = {
  id: "world:draw",
  owner: "world:draw",
  schema: {
    type: "object",
    title: "\u7ED8\u56FE \xB7 \u901A\u7528\u4E0E API",
    description: "\u753B\u98CE\u3001\u914D\u989D\u3001\u753B\u5939\u548C\u53C2\u8003\u56FE\u662F API \u7ED8\u753B\u4E0E\u672C\u5730\u4EBA\u8BBE\u51FA\u56FE\u5171\u7528\u7684\u4EBA\u8BBE\u8BBE\u5B9A\u3002API Key \u53EA\u4ECE\u90E8\u7F72 .env \u8BFB\u53D6\uFF0C\u4E0D\u5199\u8FDB config.json\u3002",
    properties: { ...ROUTE_PROPERTIES, ...apiProperties }
  }
};
var DRAW_LOCAL_CONFIG_GROUP = remapGroup(
  COO_GEN_CONFIG_GROUP,
  "worlds.coo-gen.",
  (short) => `worlds.draw.local${capitalize(short)}`,
  {
    id: "world:draw-local",
    title: "\u672C\u5730\u51FA\u56FE \xB7 ComfyUI",
    description: "\u7528\u6237\u81EA\u5DF1\u7684\u51FA\u56FE\uFF1A\u8FDE\u63A5\u3001\u6A21\u578B\u3001LoRA\u3001\u91C7\u6837\u3001\u4FDD\u5B58\u76EE\u5F55\u3001\u542F\u52A8\u811A\u672C\u3002\u8FD9\u91CC\u53EA\u5F71\u54CD\u300C\u672C\u5730\u51FA\u56FE\u300D\u9875\uFF0C\u4E0D\u5F71\u54CD\u94C3\u5170\u7684\u4EBA\u8BBE\u7B14\u89E6\u3002"
  }
);
var DRAW_PERSONA_CONFIG_GROUP = {
  id: "world:draw-persona",
  owner: "world:draw",
  schema: {
    type: "object",
    title: "\u4EBA\u8BBE\u7B14\u89E6 \xB7 \u672C\u5730",
    description: "\u94C3\u5170\u4E3B\u52A8\u753B\u6216\u65E5\u8BB0\u914D\u56FE\u88AB\u8DEF\u7531\u5230\u672C\u5730\u65F6\uFF0C\u7528\u8FD9\u5957\u72EC\u7ACB\u7684\u6A21\u578B\u3001LoRA \u548C\u91C7\u6837\u53C2\u6570\uFF0C\u56FA\u5B9A 512\xD7512\u3001\u4E00\u6B21\u4E00\u5F20\u3002\u6539\u52A8\u4E0D\u4F1A\u5F71\u54CD\u300C\u672C\u5730\u51FA\u56FE\u300D\u9875\u7684\u7528\u6237\u53C2\u6570\uFF1B\u753B\u51FA\u6765\u7684\u56FE\u4ECD\u8FDB\u753B\u5939\u3001\u53EF\u4EE5\u8BC4\u4EF7\u3002",
    properties: {
      "worlds.draw.personaWorkflow": {
        type: "string",
        title: "\u4EBA\u8BBE\u5DE5\u4F5C\u6D41",
        "x-section": "\u6A21\u578B",
        description: "\u7F3A\u7701 persona-krea2\uFF08\u5185\u7F6E Krea2 \u6587\u751F\u56FE\uFF09\u3002\u56FE\u751F\u56FE\u4F1A\u6309\u53C2\u8003\u56FE\u81EA\u52A8\u6D3E\u751F\uFF0C\u4E0D\u7528\u53E6\u9009\u3002",
        "x-hot": true
      },
      "worlds.draw.personaUnet": {
        type: "string",
        title: "\u4EBA\u8BBE\u6A21\u578B\uFF08UNET\uFF09",
        "x-section": "\u6A21\u578B",
        description: "\u5185\u7F6E\u4EBA\u8BBE\u5DE5\u4F5C\u6D41\u52A0\u8F7D\u7684 diffusion/UNET \u6587\u4EF6\u540D\uFF0C\u4F8B\u5982 krea2_turbo_nvfp4.safetensors\u3002",
        "x-hot": true
      },
      "worlds.draw.personaClip": {
        type: "string",
        title: "\u4EBA\u8BBE\u6587\u672C\u7F16\u7801\u5668",
        "x-section": "\u6A21\u578B",
        description: "Krea2 \u914D qwen3vl_4b_fp8_scaled.safetensors\uFF1B\u6362\u6A21\u578B\u65F6\u4E00\u8D77\u6539\u3002",
        "x-hot": true
      },
      "worlds.draw.personaVae": {
        type: "string",
        title: "\u4EBA\u8BBE VAE",
        "x-section": "\u6A21\u578B",
        description: "\u4E0E\u6A21\u578B\u914D\u5957\u7684 VAE\uFF0C\u4F8B\u5982 qwen_image_vae.safetensors\u3002",
        "x-hot": true
      },
      "worlds.draw.personaSteps": {
        type: "integer",
        title: "\u4EBA\u8BBE\u6B65\u6570",
        "x-section": "\u91C7\u6837",
        description: "Krea2 Turbo \u5EFA\u8BAE 8 \u6B65\uFF1B\u5176\u5B83\u5DE5\u4F5C\u6D41\u6309\u81EA\u5DF1\u7684\u9700\u8981\u6539\u3002",
        minimum: 1,
        maximum: 100,
        "x-hot": true
      },
      "worlds.draw.personaCfg": {
        type: "number",
        title: "\u4EBA\u8BBE CFG",
        "x-section": "\u91C7\u6837",
        description: "Krea2 Turbo \u56FA\u5B9A 1\uFF1B\u6362\u666E\u901A\u6A21\u578B\u65F6\u518D\u8C03\u3002",
        minimum: 1,
        maximum: 30,
        "x-hot": true
      },
      "worlds.draw.personaSampler": {
        type: "string",
        title: "\u4EBA\u8BBE\u91C7\u6837\u5668",
        "x-section": "\u91C7\u6837",
        description: "\u4F8B\u5982 euler / euler_ancestral\u3002",
        "x-hot": true
      },
      "worlds.draw.personaScheduler": {
        type: "string",
        title: "\u4EBA\u8BBE\u8C03\u5EA6\u5668",
        "x-section": "\u91C7\u6837",
        description: "\u4F8B\u5982 simple / normal\u3002",
        "x-hot": true
      },
      "worlds.draw.personaLoras": {
        type: "string",
        title: "\u4EBA\u8BBE LoRA",
        "x-section": "\u63D0\u793A\u8BCD",
        description: "`\u6587\u4EF6\u540D:\u6743\u91CD`\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u6700\u591A 3 \u4E2A\uFF1B\u7559\u7A7A = \u7EAF\u6A21\u578B\u3002\u53EA\u5F71\u54CD\u4EBA\u8BBE\u7B14\u89E6\u3002",
        "x-hot": true
      },
      "worlds.draw.personaNegative": {
        type: "string",
        title: "\u4EBA\u8BBE\u8D1F\u9762\u8BCD",
        "x-section": "\u63D0\u793A\u8BCD",
        description: "\u538B\u4F4F\u7167\u7247/\u5199\u5B9E/3D/\u6587\u5B57/\u6C34\u5370\u8FD9\u7C7B\u4F1A\u7834\u574F\u624B\u7ED8\u611F\u7684\u5143\u7D20\uFF1BKrea2 CFG=1 \u65F6\u53EF\u80FD\u4E0D\u8D77\u4F5C\u7528\uFF0C\u6362\u666E\u901A\u6A21\u578B\u65F6\u751F\u6548\u3002",
        "x-hot": true
      },
      "worlds.draw.personaExtraPrompt": {
        type: "string",
        title: "\u4EBA\u8BBE\u63D0\u793A\u8BCD\u8865\u5145",
        "x-section": "\u63D0\u793A\u8BCD",
        description: "\u8FFD\u52A0\u5728\u6BCF\u5F20\u4EBA\u8BBE\u753B\u540E\u9762\u7684\u4E00\u53E5\uFF0C\u6BD4\u5982\u7EB8\u5F20\u3001\u7B14\u89E6\u7EC6\u8282\uFF1B\u7559\u7A7A\u5373\u53EF\u3002",
        "x-hot": true
      },
      "worlds.draw.personaReferenceMode": {
        type: "string",
        title: "\u672C\u5730\u53C2\u8003\u56FE\u65B9\u5F0F",
        "x-section": "\u53C2\u8003",
        description: "describe = \u94C3\u5170\u5148\u770B\u53C2\u8003\u56FE\u3001\u5199\u4E00\u53E5\u753B\u4EC0\u4E48\uFF0C\u518D\u51FA\u56FE\uFF08\u66F4\u7A33\uFF0C\u4F46\u591A\u4E00\u8F6E\uFF09\uFF1Bimg2img = \u76F4\u63A5\u628A\u53C2\u8003\u56FE\u91CD\u7ED8\uFF08\u5FEB\uFF0C\u4F46\u53EF\u80FD\u4E0D\u591F\u50CF\u94C3\u5170\u7684\u624B\u7B14\uFF09\u3002",
        enum: ["describe", "img2img"],
        "x-options": "draw-persona-reference",
        "x-hot": true
      },
      "worlds.draw.personaImg2imgDenoise": {
        type: "number",
        title: "\u56FE\u751F\u56FE\u91CD\u7ED8\u5E45\u5EA6",
        "x-section": "\u53C2\u8003",
        description: "0.05\u20131\u3002\u8D8A\u9AD8\u8D8A\u50CF\u65B0\u753B\u3001\u8D8A\u4F4E\u8D8A\u4FDD\u7559\u53C2\u8003\u56FE\uFF1B\u4EBA\u8BBE\u7B14\u89E6\u5EFA\u8BAE 0.45\u20130.65\u3002",
        minimum: 0.05,
        maximum: 1,
        "x-hot": true
      }
    }
  }
};
var DRAW_GROUPS = [
  DRAW_CONFIG_GROUP,
  DRAW_LOCAL_CONFIG_GROUP,
  DRAW_PERSONA_CONFIG_GROUP
];

// src/webui/parts/config-panel.ts
var SECTION_ORDER = {
  "world:draw": ["\u8DEF\u7531", "\u98CE\u683C\u4E0E\u753B\u6CD5", "\u5B58\u50A8", "\u914D\u989D\u4E0E\u9650\u5236", "\u6C14\u6CE1\u5C55\u793A", "\u53C2\u8003\u56FE"],
  "world:draw-local": ["\u8FDE\u63A5\u4E0E\u8DEF\u5F84", "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570", "\u63D0\u793A\u8BCD\u9ED8\u8BA4", "\u7FFB\u8BD1", "\u8FD0\u884C\u65F6", "\u81EA\u52A8\u5316", "\u542F\u52A8\u4E0E\u5173\u95ED"],
  "world:draw-persona": ["\u6A21\u578B", "\u91C7\u6837", "\u63D0\u793A\u8BCD", "\u53C2\u8003"]
};
function groupSections(groupId) {
  return SECTION_ORDER[groupId] || [];
}
function labelZh(key) {
  const map = {
    "\u8DEF\u7531": "\u8DEF\u7531",
    "\u98CE\u683C\u4E0E\u753B\u6CD5": "\u98CE\u683C\u4E0E\u753B\u6CD5",
    "\u5B58\u50A8": "\u5B58\u50A8",
    "\u914D\u989D\u4E0E\u9650\u5236": "\u914D\u989D\u4E0E\u9650\u5236",
    "\u6C14\u6CE1\u5C55\u793A": "\u6C14\u6CE1\u5C55\u793A",
    "\u53C2\u8003\u56FE": "\u53C2\u8003\u56FE",
    "\u8FDE\u63A5\u4E0E\u8DEF\u5F84": "\u8FDE\u63A5\u4E0E\u8DEF\u5F84",
    "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570": "\u9ED8\u8BA4\u91C7\u6837\u53C2\u6570",
    "\u63D0\u793A\u8BCD\u9ED8\u8BA4": "\u63D0\u793A\u8BCD\u9ED8\u8BA4",
    "\u7FFB\u8BD1": "\u7FFB\u8BD1",
    "\u8FD0\u884C\u65F6": "\u8FD0\u884C\u65F6",
    "\u81EA\u52A8\u5316": "\u81EA\u52A8\u5316",
    "\u542F\u52A8\u4E0E\u5173\u95ED": "\u542F\u52A8\u4E0E\u5173\u95ED",
    "\u6A21\u578B": "\u6A21\u578B",
    "\u91C7\u6837": "\u91C7\u6837",
    "\u63D0\u793A\u8BCD": "\u63D0\u793A\u8BCD",
    "\u53C2\u8003": "\u53C2\u8003"
  };
  return map[key] || key;
}
var configPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    const doc = ctx.root.ownerDocument;
    const root = doc.createElement("div");
    root.className = "coo-config-root";
    const style = doc.createElement("style");
    style.textContent = `
.coo-config-root{ display:flex; gap:24px; align-items:flex-start; }
.coo-config-nav{ position:sticky; top:16px; width:200px; flex-shrink:0; border:1px solid #e5e7eb; border-radius:8px; padding:12px 8px; background:#fafafa; max-height:calc(100vh - 32px); overflow:auto; }
.coo-config-nav a{ display:block; padding:6px 8px; border-radius:6px; color:#374151; text-decoration:none; font-size:13px; }
.coo-config-nav a.active{ background:#e0e7ff; color:#3730a3; font-weight:600; }
.coo-config-nav .nav-h3{ padding-left:16px; font-size:12px; color:#6b7280; }
.coo-config-nav .nav-group{ font-weight:600; margin-top:10px; }
.coo-config-nav .nav-group:first-child{ margin-top:0; }
.coo-config-main{ flex:1; min-width:0; padding-bottom:72px; }
.coo-config-card{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:20px; }
.coo-config-card h2{ margin:0 0 4px 0; font-size:16px; }
.coo-config-card .desc{ color:#6b7280; font-size:12px; margin-bottom:12px; }
.coo-config-h3{ font-size:14px; font-weight:600; color:#1f2937; margin:16px 0 8px 0; padding:6px 0 6px 8px; border-left:3px solid #6366f1; background:#f8fafc; }
.coo-config-row{ display:grid; grid-template-columns:160px minmax(0,480px) 1fr; gap:6px 16px; align-items:start; padding:10px 0; border-bottom:1px solid #f3f4f6; }
.coo-config-row:last-child{ border-bottom:none; }
.coo-config-label{ width:160px; text-align:left; font-size:13px; color:#374151; line-height:1.45; padding-top:6px; word-break:break-word; }
.coo-config-field{ max-width:480px; display:flex; align-items:center; gap:8px; }
.coo-config-field input[type=text], .coo-config-field input[type=number], .coo-config-field select, .coo-config-field textarea{ width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:6px; padding:6px 8px; font-size:13px; }
.coo-config-field textarea{ min-height:56px; resize:vertical; line-height:1.45; }
.coo-config-desc{ font-size:12px; color:#6b7280; line-height:1.4; padding-top:6px; }
.coo-config-desc .help{ display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:#e5e7eb; font-size:10px; cursor:help; margin-left:4px; }
.coo-config-unit{ font-size:12px; color:#6b7280; white-space:nowrap; }
.coo-config-path{ display:flex; gap:6px; width:100%; }
.coo-config-path button{ flex-shrink:0; }
.coo-config-switch{ position:relative; display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
.coo-config-switch input{ appearance:none; width:36px; height:20px; background:#e5e7eb; border-radius:999px; position:relative; cursor:pointer; transition:.2s; }
.coo-config-switch input:checked{ background:#6366f1; }
.coo-config-switch input::after{ content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 2px rgba(0,0,0,.2); }
.coo-config-switch input:checked::after{ transform:translateX(16px); }
.coo-config-disabled{ opacity:.5; pointer-events:none; }
.coo-config-char{ font-size:11px; color:#9ca3af; text-align:right; margin-top:2px; }
.coo-config-footer{ position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #e5e7eb; padding:10px 24px; display:flex; align-items:center; gap:12px; justify-content:flex-end; z-index:10; box-shadow:0 -2px 8px rgba(0,0,0,.06); }
.coo-config-footer .dirty{ margin-right:auto; font-size:13px; color:#d97706; }
.coo-config-footer .saved{ margin-right:auto; font-size:13px; color:#059669; }
.coo-config-footer button{ padding:6px 14px; border-radius:6px; border:1px solid #d1d5db; background:#fff; cursor:pointer; font-size:13px; }
.coo-config-footer button.primary{ background:#6366f1; color:#fff; border-color:#6366f1; }
.coo-config-footer button:disabled{ opacity:.5; cursor:not-allowed; }
@media (max-width: 900px){ .coo-config-root{ flex-direction:column; } .coo-config-nav{ position:static; width:100%; display:flex; flex-wrap:wrap; gap:4px; } }
`;
    root.appendChild(style);
    const nav = doc.createElement("nav");
    nav.className = "coo-config-nav";
    const main = doc.createElement("div");
    main.className = "coo-config-main";
    root.append(nav, main);
    const msgEl = doc.createElement("div");
    msgEl.style.cssText = "padding:20px;color:#6b7280";
    msgEl.textContent = t("\u52A0\u8F7D\u4E2D\u2026", "Loading\u2026");
    main.appendChild(msgEl);
    ctx.root.appendChild(root);
    let values = {};
    let initialValues = {};
    let dirty = false;
    let fieldEls = [];
    function updateDirty() {
      const nowDirty = fieldEls.some((f) => {
        const cur = f.read();
        const saved = initialValues[f.groupId]?.[f.path];
        return JSON.stringify(cur) !== JSON.stringify(saved);
      });
      if (nowDirty !== dirty) {
        dirty = nowDirty;
        renderFooter();
      }
      for (const f of fieldEls) {
        if (f.dependsOn) {
          const dep = fieldEls.find((x) => x.path === f.dependsOn);
          const depVal = dep?.read();
          const disabled = String(depVal) !== String(f.dependsValue);
          f.el.classList.toggle("coo-config-disabled", disabled);
          const inputs = f.el.querySelectorAll("input,select,textarea,button");
          inputs.forEach((inp) => inp.disabled = disabled);
          if (disabled) f.el.title = t("\u9700\u5148\u6EE1\u8DB3\u8054\u52A8\u6761\u4EF6", "Requirement not met");
          else f.el.title = "";
        }
      }
    }
    let footer = null;
    function renderFooter() {
      if (footer) footer.remove();
      footer = doc.createElement("div");
      footer.className = "coo-config-footer";
      const status = doc.createElement("span");
      status.className = dirty ? "dirty" : "saved";
      status.textContent = dirty ? "\u25CF " + t("\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539", "Unsaved changes") : t("\u6240\u6709\u914D\u7F6E\u5DF2\u4FDD\u5B58", "All saved");
      const btnReset = doc.createElement("button");
      btnReset.textContent = t("\u6062\u590D\u9ED8\u8BA4", "Reset");
      btnReset.onclick = async () => {
        if (!confirm(t("\u6062\u590D\u5F53\u524D\u9875\u7684\u9ED8\u8BA4\u503C\uFF1F", "Reset to defaults?"))) return;
        await load();
      };
      const btnCancel = doc.createElement("button");
      btnCancel.textContent = t("\u53D6\u6D88", "Cancel");
      btnCancel.onclick = () => {
        if (dirty && !confirm(t("\u653E\u5F03\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF1F", "Discard changes?"))) return;
        for (const f of fieldEls) {
          const v = initialValues[f.groupId]?.[f.path];
          if (v !== void 0) f.write(v);
        }
        updateDirty();
      };
      const btnSave = doc.createElement("button");
      btnSave.className = "primary";
      btnSave.textContent = t("\u4FDD\u5B58", "Save");
      btnSave.disabled = !dirty;
      btnSave.onclick = async () => {
        btnSave.disabled = true;
        status.textContent = t("\u4FDD\u5B58\u4E2D\u2026", "Saving\u2026");
        try {
          for (const g of DRAW_GROUPS) {
            const vals = {};
            let has = false;
            for (const f of fieldEls.filter((x) => x.groupId === g.id)) {
              vals[f.path] = f.read();
              has = true;
            }
            if (!has) continue;
            const res = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: g.id, values: vals }) });
            if (!res.ok) throw new Error(await res.text());
          }
          await refreshValues();
          msgEl.textContent = "";
          status.textContent = t("\u5DF2\u4FDD\u5B58", "Saved");
          status.className = "saved";
          dirty = false;
          renderFooter();
        } catch (e) {
          alert(t("\u4FDD\u5B58\u5931\u8D25\uFF1A", "Save failed: ") + (e?.message || String(e)));
          btnSave.disabled = false;
        }
      };
      footer.append(status, btnReset, btnCancel, btnSave);
      doc.body.appendChild(footer);
    }
    async function fetchValues() {
      const r = await fetch("/api/config");
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      const out = {};
      for (const g of j.groups || []) {
        out[g.group.id] = g.values || {};
      }
      return out;
    }
    async function refreshValues() {
      const v = await fetchValues();
      values = v;
      initialValues = JSON.parse(JSON.stringify(v));
      updateDirty();
    }
    async function load() {
      try {
        const v = await fetchValues();
        values = v;
        initialValues = JSON.parse(JSON.stringify(v));
        build();
        renderFooter();
        window.addEventListener("beforeunload", (e) => {
          if (dirty) {
            e.preventDefault();
            e.returnValue = "";
          }
        });
      } catch (e) {
        msgEl.textContent = t("\u52A0\u8F7D\u5931\u8D25\uFF1A", "Load failed: ") + (e?.message || String(e));
      }
    }
    function build() {
      fieldEls = [];
      main.replaceChildren();
      nav.replaceChildren();
      for (const group of DRAW_GROUPS) {
        const props = group.schema.properties || {};
        const sectionMap = /* @__PURE__ */ new Map();
        const noSection = [];
        for (const [path, prop] of Object.entries(props)) {
          const sec = prop["x-section"];
          if (sec) {
            if (!sectionMap.has(sec)) sectionMap.set(sec, []);
            sectionMap.get(sec).push([path, prop]);
          } else noSection.push([path, prop]);
        }
        const orderedSecs = groupSections(group.id);
        const sortedSections = [];
        for (const s of orderedSecs) {
          if (sectionMap.has(s)) sortedSections.push([s, sectionMap.get(s)]);
        }
        for (const [k, v] of sectionMap) {
          if (!orderedSecs.includes(k)) sortedSections.push([k, v]);
        }
        const secId = `sec-${group.id}`;
        const navGroup = doc.createElement("div");
        navGroup.className = "nav-group";
        const navA = doc.createElement("a");
        navA.href = `#${secId}`;
        navA.textContent = group.schema.title || group.id;
        navA.onclick = (e) => {
          e.preventDefault();
          doc.getElementById(secId)?.scrollIntoView({ behavior: "smooth" });
        };
        navGroup.appendChild(navA);
        nav.appendChild(navGroup);
        for (const [sName] of sortedSections) {
          const subA = doc.createElement("a");
          subA.className = "nav-h3";
          subA.href = `#${secId}-${sName}`;
          subA.textContent = labelZh(sName);
          subA.onclick = (e) => {
            e.preventDefault();
            doc.getElementById(`${secId}-${sName}`)?.scrollIntoView({ behavior: "smooth" });
          };
          nav.appendChild(subA);
        }
        if (noSection.length) {
          const subA = doc.createElement("a");
          subA.className = "nav-h3";
          subA.textContent = t("\u5176\u4ED6", "Other");
          nav.appendChild(subA);
        }
        const card = doc.createElement("div");
        card.className = "coo-config-card";
        card.id = secId;
        const h2 = doc.createElement("h2");
        h2.textContent = group.schema.title || group.id;
        const desc = doc.createElement("div");
        desc.className = "desc";
        desc.textContent = group.schema.description || "";
        card.append(h2, desc);
        const renderRows = (list, sectionName) => {
          if (sectionName) {
            const h3 = doc.createElement("div");
            h3.className = "coo-config-h3";
            h3.id = `${secId}-${sectionName}`;
            h3.textContent = labelZh(sectionName);
            card.appendChild(h3);
          }
          for (const [path, prop] of list) {
            const row = doc.createElement("div");
            row.className = "coo-config-row";
            const label = doc.createElement("div");
            label.className = "coo-config-label";
            label.textContent = prop.title || path;
            if (prop["x-warning"]) label.style.color = "#d97706";
            if (prop["x-hot"] === false) {
              const tag = doc.createElement("span");
              tag.style.cssText = "margin-left:6px;font-size:11px;background:#fef3c7;padding:1px 4px;border-radius:4px";
              tag.textContent = t("\u9700\u91CD\u542F", "Restart required");
              label.appendChild(tag);
            }
            const fieldWrap = doc.createElement("div");
            fieldWrap.className = "coo-config-field";
            const descWrap = doc.createElement("div");
            descWrap.className = "coo-config-desc";
            descWrap.textContent = prop.description || "";
            if (prop["x-help"]) {
              const help = doc.createElement("span");
              help.className = "help";
              help.textContent = "\u24D8";
              help.title = prop["x-help"];
              descWrap.appendChild(help);
            }
            const currentVal = values[group.id]?.[path] ?? (prop.type === "boolean" ? false : prop.type === "integer" || prop.type === "number" ? 0 : "");
            let read = () => currentVal;
            let write = () => {
            };
            if (prop.type === "boolean") {
              const lab = doc.createElement("label");
              lab.className = "coo-config-switch";
              const cb = doc.createElement("input");
              cb.type = "checkbox";
              cb.checked = !!currentVal;
              cb.onchange = () => updateDirty();
              lab.append(cb, doc.createTextNode(cb.checked ? t("\u5F00", "On") : t("\u5173", "Off")));
              cb.addEventListener("change", () => lab.lastChild.textContent = cb.checked ? t("\u5F00", "On") : t("\u5173", "Off"));
              fieldWrap.appendChild(lab);
              read = () => cb.checked;
              write = (v) => {
                cb.checked = !!v;
                lab.lastChild.textContent = cb.checked ? t("\u5F00", "On") : t("\u5173", "Off");
              };
            } else if (prop.enum || prop["x-options"]) {
              const sel = doc.createElement("select");
              const xopts = prop["x-options"];
              if (xopts === "draw-route") {
                sel.appendChild(new Option(t("API \u7ED8\u753B\uFF08\u5343\u95EE\uFF09", "API (Qianwen)"), "api"));
                sel.appendChild(new Option(t("\u672C\u5730\u51FA\u56FE\uFF08ComfyUI\uFF09", "Local ComfyUI"), "local"));
                sel.value = String(currentVal);
              } else if (xopts === "draw-persona-reference") {
                sel.appendChild(new Option(t("\u5148\u770B\u53C2\u8003\u56FE\u5199\u63D0\u793A\u8BCD", "Describe first"), "describe"));
                sel.appendChild(new Option(t("\u56FE\u751F\u56FE", "img2img"), "img2img"));
                sel.value = String(currentVal);
              } else {
                let opts = prop.enum || [];
                for (const o of opts) {
                  const op = doc.createElement("option");
                  op.value = o;
                  op.textContent = o;
                  sel.appendChild(op);
                }
                sel.value = String(currentVal);
              }
              sel.onchange = () => updateDirty();
              fieldWrap.appendChild(sel);
              read = () => sel.value;
              write = (v) => {
                sel.value = v == null ? "" : String(v);
              };
            } else if (prop["x-path"]) {
              const inp = doc.createElement("input");
              inp.type = "text";
              inp.value = String(currentVal || "");
              inp.placeholder = t("\u8DEF\u5F84", "Path");
              inp.oninput = () => updateDirty();
              const btnBrowse = doc.createElement("button");
              btnBrowse.type = "button";
              btnBrowse.textContent = t("\u6D4F\u89C8\u2026", "Browse\u2026");
              btnBrowse.style.cssText = "padding:6px 10px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer";
              btnBrowse.onclick = async () => {
                const v = prompt(t("\u8F93\u5165\u8DEF\u5F84", "Enter path"), inp.value);
                if (v != null) {
                  inp.value = v;
                  updateDirty();
                }
              };
              const btnOpen = doc.createElement("button");
              btnOpen.type = "button";
              btnOpen.textContent = t("\u6253\u5F00", "Open");
              btnOpen.style.cssText = "padding:6px 10px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer";
              btnOpen.onclick = async () => {
                try {
                  await fetch("/api/open?path=" + encodeURIComponent(inp.value));
                } catch {
                }
              };
              const pathWrap = doc.createElement("div");
              pathWrap.className = "coo-config-path";
              pathWrap.append(inp, btnBrowse, btnOpen);
              fieldWrap.appendChild(pathWrap);
              read = () => inp.value;
              write = (v) => {
                inp.value = v == null ? "" : String(v);
              };
            } else if (prop.type === "integer" || prop.type === "number") {
              const inp = doc.createElement("input");
              inp.type = "number";
              if (prop.minimum != null) inp.min = String(prop.minimum);
              if (prop.maximum != null) inp.max = String(prop.maximum);
              if (prop.multipleOf != null) inp.step = String(prop.multipleOf);
              else inp.step = prop.type === "integer" ? "1" : "0.1";
              inp.value = String(currentVal ?? "");
              inp.oninput = () => updateDirty();
              fieldWrap.appendChild(inp);
              if (prop["x-suffix"] || prop["x-unit"]) {
                const unit = doc.createElement("span");
                unit.className = "coo-config-unit";
                unit.textContent = prop["x-suffix"] || prop["x-unit"];
                fieldWrap.appendChild(unit);
              }
              read = () => {
                const v = inp.value.trim() === "" ? prop.nullable ? null : 0 : Number(inp.value);
                return v;
              };
              write = (v) => {
                inp.value = v == null ? "" : String(v);
              };
            } else {
              const isLong = path.includes("negative") || path.includes("customStyle") || path.includes("personaNegative") || path.includes("prompt") || path.includes("loras") || (prop.description || "").length > 60 || prop["x-multiline"];
              if (isLong) {
                const ta = doc.createElement("textarea");
                ta.rows = 2;
                ta.value = String(currentVal || "");
                ta.oninput = () => {
                  updateDirty();
                  if (counter) counter.textContent = `${ta.value.length} / 600`;
                };
                fieldWrap.appendChild(ta);
                const counter = doc.createElement("div");
                counter.className = "coo-config-char";
                counter.textContent = `${ta.value.length} / 600`;
                const wrap = doc.createElement("div");
                wrap.style.width = "100%";
                wrap.append(ta, counter);
                fieldWrap.replaceChildren(wrap);
                read = () => ta.value;
                write = (v) => {
                  ta.value = v == null ? "" : String(v);
                  counter.textContent = `${ta.value.length} / 600`;
                };
              } else {
                const inp = doc.createElement("input");
                inp.type = "text";
                inp.value = String(currentVal || "");
                inp.oninput = () => updateDirty();
                fieldWrap.appendChild(inp);
                read = () => inp.value;
                write = (v) => {
                  inp.value = v == null ? "" : String(v);
                };
              }
            }
            row.append(label, fieldWrap, descWrap);
            card.appendChild(row);
            fieldEls.push({ groupId: group.id, path, read, write, el: row, dependsOn: prop["x-dependsOn"], dependsValue: prop["x-dependsValue"] });
          }
        };
        for (const [secName, list] of sortedSections) renderRows(list, secName);
        if (noSection.length) renderRows(noSection, void 0);
        main.appendChild(card);
      }
      updateDirty();
      const obs = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.id;
            nav.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
            const hit = nav.querySelector(`a[href="#${id}"]`);
            if (hit) hit.classList.add("active");
          }
        }
      }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
      main.querySelectorAll(".coo-config-card, .coo-config-h3").forEach((el) => obs.observe(el));
      ctx.own({ dispose: () => obs.disconnect() });
    }
    await load();
  }
};

// src/webui/client.ts
function message2(error) {
  return error instanceof Error ? error.message : String(error);
}
var apiPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    await folderPanel.mount(ctx);
    let settings = null;
    try {
      settings = await ctx.invoke("settings");
    } catch {
    }
  }
};
var LOCAL_SUBS = [
  { value: "studio", label: ["\u51FA\u56FE", "Studio"], panel: studioPanel, backend: "studio" },
  { value: "works", label: ["\u4F5C\u54C1", "Works"], panel: worksPanel, backend: "studio" },
  { value: "loras", label: ["LoRA \u7BA1\u7406", "LoRAs"], panel: lorasPanel, backend: "loras" },
  { value: "workflows", label: ["\u5DE5\u4F5C\u6D41", "Workflows"], panel: workflowsPanel, backend: "workflows" }
];
var localPanel = {
  async mount(ctx) {
    const zh = ctx.language.startsWith("zh");
    const t = (z, e) => zh ? z : e;
    const doc = ctx.root.ownerDocument;
    const seg = ctx.ui.segmented(
      LOCAL_SUBS.map((item) => ({ value: item.value, label: zh ? item.label[0] : item.label[1] })),
      {
        value: "studio",
        onSelect: (value) => {
          void show(value);
        }
      }
    );
    const host = doc.createElement("div");
    ctx.root.append(seg.el, host);
    let controller = null;
    let disposables = [];
    let current = "";
    const switchTo = (value) => {
      void show(value);
    };
    host.addEventListener("coo-switch-tab", (e) => {
      const detail = e.detail;
      if (detail && LOCAL_SUBS.some((s) => s.value === detail)) switchTo(detail);
    });
    host.addEventListener("coo-works-unread", (e) => {
      const unread = e.detail;
      const btn = seg.el.querySelectorAll("button");
      for (const b of Array.from(btn)) {
        const txt = b.textContent || "";
        if (txt.includes("\u4F5C\u54C1") || txt.includes("Works")) {
          let dot = b.querySelector(".coo-tab-dot");
          if (unread > 0) {
            if (!dot) {
              dot = doc.createElement("span");
              dot.className = "coo-tab-dot";
              b.append(dot);
            }
          } else if (dot) dot.remove();
          break;
        }
      }
    });
    async function show(value) {
      if (value === current) return;
      current = value;
      controller?.abort();
      for (const item of disposables.splice(0)) {
        try {
          item.dispose();
        } catch {
        }
      }
      host.replaceChildren();
      seg.setValue(value);
      controller = new AbortController();
      if (ctx.signal.aborted) controller.abort();
      else ctx.signal.addEventListener("abort", () => controller?.abort(), { once: true });
      const entry = LOCAL_SUBS.find((item) => item.value === value);
      if (!entry) return;
      const prefix = entry.backend;
      const child = {
        ...ctx,
        root: host,
        signal: controller.signal,
        invoke: (method, args) => ctx.invoke(`${prefix}.${method}`, args),
        invokeBinary: (method, args) => ctx.invokeBinary(`${prefix}.${method}`, args),
        own: (item) => {
          disposables.push(item);
          return item;
        }
      };
      child.switchTab = switchTo;
      try {
        await entry.panel.mount(child);
      } catch (error) {
        host.append(ctx.ui.msgline(`${t("\u9762\u677F\u52A0\u8F7D\u5931\u8D25\uFF1A", "Panel failed: ")}${message2(error)}`, true));
      }
    }
    ctx.own({
      dispose: () => {
        controller?.abort();
        for (const item of disposables.splice(0)) {
          try {
            item.dispose();
          } catch {
          }
        }
      }
    });
    await show("studio");
  }
};
var bundle = {
  panels: {
    api: apiPanel,
    local: localPanel,
    config2: configPanel,
    studio: studioPanel,
    loras: lorasPanel,
    workflows: workflowsPanel,
    works: worksPanel
  }
};
var client_default = bundle;
export {
  client_default as default
};
