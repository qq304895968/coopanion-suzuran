import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { feedbackOptions, monitorOptions, SCREEN_DEFAULTS, type ScreenConfigSection } from './config.ts';
import { SCREEN_TOOL_DECLS, ScreenWorld } from './world.ts';

export const SCREEN: WorldDefinition<ScreenConfigSection> = {
  id: 'screen',
  label: '看一眼',
  defaults: () => ({ ...SCREEN_DEFAULTS }),

  /** 抓屏走 Win32 GDI,侧车是 Python,别的平台还没做。 */
  preflight: () => {
    if (process.platform !== 'win32') {
      throw new Error('「看一眼」目前只支持 Windows:抓屏和全局热键都走 Win32。');
    }
  },

  create: (ctx) => new ScreenWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    dataDir: ctx.dataDir,
  }),

  /** 选项表由 World 提供,WebUI 按当前语言显示。 */
  configOptions: (kind, language) => {
    if (kind === 'screen.monitor') return monitorOptions(language);
    if (kind === 'screen.feedback') return feedbackOptions(language);
    return [];
  },

  describe: {
    tools: describeTools(SCREEN_TOOL_DECLS, {
      screen_look: {
        zh: '现抓一帧用户当前的屏幕,图随回执交回来。',
        en: "Captures the user's screen right now and returns the image with the result.",
      },
      screen_rate: {
        zh: '给刚看到的一帧打 1–10 分;达到阈值的记成深刻瞬间。',
        en: 'Scores a just-seen frame from 1–10 and keeps it as a memorable moment above the threshold.',
      },
      screen_memories: {
        zh: '回想某一天的深刻瞬间,可把原图作为附件交回来。',
        en: 'Recalls the memorable moments of a day, optionally returning the screenshots as attachments.',
      },
    }),
    events: [
      {
        type: 'screen.shot',
        description: {
          zh: '用户按热键、双击桌宠、桌宠自己看了一眼,或侧车报错/状态变化。截图事件带一张 PNG 附件。',
          en: 'The user pressed the hotkey or double-clicked the pet, the pet peeked on its own, or the sidecar reported a problem. Capture events carry one PNG.',
        },
      },
    ],
  },
};
