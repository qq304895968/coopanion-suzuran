import type { ConfigGroup } from 'cortico/core/types.ts';

/** `config.json` 的 `worlds.arknights` 段。默认禁用，由部署或 bot 启用。 */
export interface ArknightsConfigSection {
  enabled: boolean;
  /** 是否在对局状态变化时主动推事件（让 Coo 开口）。关掉后工具照常记账，只是不催 Coo 说话。 */
  commentary: boolean;
  /** 本地战绩保留最近多少局。 */
  maxHistory: number;
  /** 提醒轮询间隔（秒）。改了要重启 World 才生效。 */
  reminderPollSeconds: number;
  /** 对局进行中，是否在你没动静时主动催一句。 */
  proactive: boolean;
  /** 多久没更新就催（分钟）。 */
  nudgeMinutes: number;
}

export const ARKNIGHTS_DEFAULTS: ArknightsConfigSection = {
  enabled: false,
  commentary: true,
  maxHistory: 50,
  reminderPollSeconds: 30,
  proactive: true,
  nudgeMinutes: 3,
};

export const ARKNIGHTS_CONFIG_GROUP: ConfigGroup = {
  id: 'world:arknights',
  owner: 'world:arknights',
  schema: {
    type: 'object',
    title: '明日方舟',
    properties: {
      'worlds.arknights.commentary': {
        type: 'boolean',
        title: '主动吐槽',
        description: '对局状态变化时是否推事件让 Coo 主动开口。关闭后仍会记账。',
        'x-hot': true,
      },
      'worlds.arknights.maxHistory': {
        type: 'number',
        title: '保留战绩局数',
        description: '本地战绩文件最多保留最近多少局，多出的旧记录会被丢弃。',
        minimum: 0,
        maximum: 500,
        'x-hot': true,
      },
      'worlds.arknights.reminderPollSeconds': {
        type: 'number',
        title: '提醒检查间隔（秒）',
        description: 'World 多久检查一次到期的提醒。改动后重启 World 生效。',
        minimum: 5,
        maximum: 600,
        'x-hot': false,
      },
      'worlds.arknights.proactive': {
        type: 'boolean',
        title: '没动静时主动催',
        description: '对局进行中超过设定时间没更新时，主动推一条催更（带当前层的节点构成）。',
        'x-hot': true,
      },
      'worlds.arknights.nudgeMinutes': {
        type: 'number',
        title: '催更间隔（分钟）',
        description: '多久没更新就催一次。',
        minimum: 1,
        maximum: 60,
        'x-hot': true,
      },
    },
  },
};
