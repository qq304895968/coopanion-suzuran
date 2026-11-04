/**
 * `worlds.diary` 段的形状、默认值与 WebUI 配置声明。
 * 目录与提醒都在每次使用时现读,所以三项都标 x-hot: true,改完立即生效。
 */
import type { ConfigGroup } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { pick } from 'cortico/core/language.ts';

/** config.json 的 worlds.diary 段。 */
export interface DiaryConfigSection {
  enabled: boolean;
  /** 日记目录的绝对路径;空串表示还没设置。 */
  dir: string;
  /** 到点提醒一次。 */
  reminderEnabled: boolean;
  /** 提醒时刻 `HH:mm`,按部署时区。 */
  reminderTime: string;
}

export const DIARY_DEFAULTS: DiaryConfigSection = {
  enabled: false,
  dir: '',
  reminderEnabled: false,
  reminderTime: '22:00',
};

const TEXT = {
  zh: {
    group: '日记',
    groupDescription: '日记写进哪个目录、什么时候提醒。',
    dirTitle: '日记目录',
    dirDescription: '绝对路径。每天一个 YYYY-MM-DD.md,只追加,不覆盖。留空时工具会提示去填。',
    reminderTitle: '每日提醒',
    reminderDescription: '到点在 Coopanion 里提醒一次;当天已经写过日记时不提醒。',
    reminderTimeTitle: '提醒时刻',
    reminderTimeDescription: 'HH:mm,按部署时区。',
  },
  en: {
    group: 'Diary',
    groupDescription: 'Where the diary is written and when to be reminded.',
    dirTitle: 'Diary directory',
    dirDescription: 'An absolute path. One YYYY-MM-DD.md per day, appended to, never overwritten. While empty, the tools ask for a directory.',
    reminderTitle: 'Daily reminder',
    reminderDescription: 'One reminder a day at the set time; skipped when that day already has an entry.',
    reminderTimeTitle: 'Reminder time',
    reminderTimeDescription: 'HH:mm in the deployment timezone.',
  },
};

/** World 配置组:owner 须是 `world:diary`,每条路径须落在 `worlds.diary.` 下。 */
export function diaryConfigGroup(language: Language): ConfigGroup {
  const t = pick(language, TEXT);
  return {
    id: 'world:diary',
    owner: 'world:diary',
    schema: {
      type: 'object',
      title: t.group,
      description: t.groupDescription,
      properties: {
        'worlds.diary.dir': {
          type: 'string',
          title: t.dirTitle,
          description: t.dirDescription,
          'x-hot': true,
          'x-path': { kind: 'directory' },
        },
        'worlds.diary.reminderEnabled': {
          type: 'boolean',
          title: t.reminderTitle,
          description: t.reminderDescription,
          'x-hot': true,
        },
        'worlds.diary.reminderTime': {
          type: 'string',
          title: t.reminderTimeTitle,
          description: t.reminderTimeDescription,
          'x-hot': true,
        },
      },
    },
  };
}
