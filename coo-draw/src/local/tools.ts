import type { ToolDef } from 'cortico/core/types.ts';

/** 模型看的工具声明；handler 在 world.ts 里绑定。 */
export const COO_GEN_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'coo_gen',
    description:
      'Generate a picture with the user\'s local ComfyUI. Use it when the person asks for an image, wallpaper, avatar, illustration, photo-like render or says 发我一张图 / 画一张 / 来张猫猫图. '
      + 'Write `subject` as their request (keep names and visual details). If you can, also put a strong comma-separated English Danbooru/Stable-Diffusion prompt in `prompt`; the plugin otherwise translates through its dictionary or a configured translator. '
      + 'LoRA names must come from `coo_gen_loras` or the LoRA list in the environment prompt; aliases, file names and paths are accepted, but never invent a name. '
      + 'By default the task runs in the background: this call returns a task id and a `coogen.done` event arrives later, then call `coo_gen_result` and show the returned attachment with `pet_say.images`. Set `wait: true` only when the person needs the picture in this same turn. '
      + 'A picture is not ready until a tool result or event says so; do not promise it before then. When ComfyUI is offline, tell the person to click 一键启动 in the 出图 panel or start it themselves.',
    tags: ['write'],
    interruptible: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        subject: {
          type: 'string',
          description: 'What the person wants, in their own words, e.g. 塞尔达在海边看日落. Keep it short but specific.',
        },
        prompt: {
          type: 'string',
          description: 'Optional English tag prompt you compose from subject, e.g. "zelda, princess zelda, blonde hair, pointy ears, seaside sunset, masterpiece". If given, it is used as the visual prompt instead of the dictionary translation.',
        },
        style_hint: {
          type: 'string',
          description: 'Optional style words, e.g. 赛博朋克 / watercolor / cinematic lighting.',
        },
        extra_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional extra visual tags (pose, clothing, composition, lighting).',
        },
        negative: {
          type: 'string',
          description: 'Optional negative prompt; defaults to the configured one.',
        },
        checkpoint: {
          type: 'string',
          description: 'Optional checkpoint filename from the available list; defaults to the configured model.',
        },
        loras: {
          type: 'array',
          description: 'Optional LoRAs picked for this request. Prefer 0–2; the plugin merges them with the always-on defaults and caps the total.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string', description: 'LoRA path, file name or alias.' },
              weight: { type: 'number', minimum: 0.05, maximum: 2, description: 'Weight, usually 0.6–1.0.' },
            },
            required: ['name'],
          },
        },
        sampler: { type: 'string', description: 'Optional sampler name, e.g. euler_ancestral.' },
        scheduler: { type: 'string', description: 'Optional scheduler, e.g. normal / karras.' },
        steps: { type: 'integer', minimum: 1, maximum: 100, description: 'Sampling steps; defaults to the configured value.' },
        cfg: { type: 'number', minimum: 1, maximum: 30, description: 'CFG scale; defaults to the configured value.' },
        width: { type: 'integer', minimum: 64, maximum: 4096, description: 'Width in pixels.' },
        height: { type: 'integer', minimum: 64, maximum: 4096, description: 'Height in pixels.' },
        batch: { type: 'integer', minimum: 1, maximum: 8, description: 'How many pictures in this task; defaults to 1.' },
        seed: { type: 'integer', description: 'Seed; -1 = random. Use the previous seed to reproduce a picture.' },
        workflow: {
          type: 'string',
          description: 'Optional workflow id: quick-txt2img, img2img, controlnet, or a preset imported in the panel.',
        },
        input_image: {
          type: 'string',
          description: 'For img2img: absolute path to a local image, or a file name already in ComfyUI input/.',
        },
        control_image: {
          type: 'string',
          description: 'For ControlNet: absolute path to the control image, or a ComfyUI input/ file name.',
        },
        control_net: { type: 'string', description: 'Optional ControlNet model filename.' },
        denoise: { type: 'number', minimum: 0.05, maximum: 1, description: 'img2img/ControlNet denoise strength.' },
        control_strength: { type: 'number', minimum: 0, maximum: 2, description: 'ControlNet strength.' },
        wait: {
          type: 'boolean',
          description: 'Wait for completion in this call (may take 10–120 s). Default false so the pet can reply immediately and show the picture when the event arrives.',
        },
        note: { type: 'string', description: 'Optional short note for the history entry, in the person\'s words.' },
      },
      required: ['subject'],
    },
  },
  {
    name: 'coo_gen_start',
    description:
      'Start the user\'s local ComfyUI with the configured launch script and wait until /system_stats is ready. Use it when the person asks to start/open ComfyUI, or after an `[offline]` result and they agree to start it. Do not start ComfyUI without being asked. This can take 10–60 seconds; answer only after the tool result says ready or gives the error. If no launch script is configured, tell the person to set it in World settings / the 出图 panel.',
    tags: ['write'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'coo_gen_stop',
    description:
      'Stop the local ComfyUI with the configured stop script. Use only when the person explicitly asks to close/stop ComfyUI or free the GPU. Never stop it on your own, and do not stop it while a generation task is still running unless the person asks.',
    tags: ['write'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'coo_gen_result',
    description:
      'Fetch the status/result of a coo-gen task and, when it is done, return the pictures as attachments for pet_say.images. Use it after a `coogen.done` event, or when the person asks 画好了吗 / 给我看看 / 刚才那张图. With no task_id it uses the latest task. `history: true` lists recent saved pictures instead; `attach` also attaches the newest one.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task_id: { type: 'string', description: 'Task id from coo_gen or a previous coogen.done event.' },
        wait_seconds: { type: 'integer', minimum: 0, maximum: 30, description: 'If still running, wait up to this many seconds before answering.' },
        history: { type: 'boolean', description: 'List recent saved pictures (newest first) instead of one task.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: 'How many history entries to list; defaults to 8.' },
        attach: { type: 'boolean', description: 'Attach the finished task image(s), or the newest history image. Default true.' },
      },
    },
  },
  {
    name: 'coo_gen_cancel',
    description: 'Cancel the running coo-gen task (or a specific one). Use only when the person asks to stop, or when the task is clearly stuck. ComfyUI may already be finishing the current step.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task_id: { type: 'string', description: 'Task to cancel; defaults to the current task.' },
      },
    },
  },
  {
    name: 'coo_gen_loras',
    description:
      'Search/list the LoRAs installed in ComfyUI, with aliases, trigger words, categories and whether each is an always-on default. Use it before choosing LoRAs for a named character or a specific style, or when the person asks 有哪些 LoRA / 有没有 X 的 LoRA. This only reads; changing defaults and aliases happens in the 出图 panel.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Name/alias/trigger/category substring; empty lists everything.' },
        category: { type: 'string', description: 'Only this folder/category.' },
        limit: { type: 'integer', minimum: 1, maximum: 60, description: 'Maximum entries; defaults to 30.' },
      },
    },
  },
  {
    name: 'coo_gen_status',
    description:
      'Check whether local ComfyUI is reachable, which checkpoints and how many LoRAs are available, the output folder, and the current task. Use it when the person asks 出图能用吗 / ComfyUI 开了吗 / 画到哪了.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        refresh: { type: 'boolean', description: 'Ignore the short cache and probe ComfyUI again.' },
      },
    },
  },
  {
    name: 'coo_gen_open_output',
    description: 'Open the folder where generated pictures are saved. Use only when the person explicitly asks to open the folder.',
    tags: ['write'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
  },
];

export const COO_GEN_TOOL_SUMMARIES = {
  coo_gen: {
    zh: '用本地 ComfyUI 出图：说一句就开画，后台任务完成后推事件；可点名模型、LoRA、采样参数。',
    en: 'Generate a picture with local ComfyUI; runs in the background and pushes an event when done.',
  },
  coo_gen_start: {
    zh: '用配置的启动脚本拉起本地 ComfyUI，并等到 /system_stats 就绪。',
    en: 'Start local ComfyUI with the configured launch script and wait until it is ready.',
  },
  coo_gen_stop: {
    zh: '用配置的关闭脚本停止本地 ComfyUI。',
    en: 'Stop local ComfyUI with the configured stop script.',
  },
  coo_gen_result: {
    zh: '取回出图任务的进度或结果，把画好的图作为附件交回来；也能翻最近的历史。',
    en: 'Fetch a task result and return the pictures as attachments; can also list recent history.',
  },
  coo_gen_cancel: {
    zh: '取消正在跑的出图任务。',
    en: 'Cancel the running generation task.',
  },
  coo_gen_loras: {
    zh: '搜索本机 LoRA，带别名、触发词、分类和常驻标记。',
    en: 'Search local LoRAs with aliases, triggers, categories and always-on flags.',
  },
  coo_gen_status: {
    zh: '查 ComfyUI 连接、模型、LoRA 数量、保存目录和当前任务。',
    en: 'Check ComfyUI connection, checkpoints, LoRA count, output folder and current task.',
  },
  coo_gen_open_output: {
    zh: '打开出图保存目录。',
    en: 'Open the output folder.',
  },
} as const;
