/** Read-only console declarations, kept separate from connection/message orchestration. */
import type { WorldLamp, WorldPanelDecl, WorldStreamSocket, WorldWebUiDecl } from 'cortico/core/types.ts';
import type { QQWorldConfig } from '../config.ts';
import { QQ_CONFIG_GROUP, QQ_VOICE_GROUP, QQ_ASR_GROUP } from '../config.ts';
import type { QQIdentity } from '../types.ts';

export interface QQConsoleState {
  config: QQWorldConfig;
  connected: boolean;
  identity: QQIdentity | null;
  convs: { size: number };
  stickers: { size: number } | null;
  proactive: { status(): { enabled: boolean } } | null;
  qzone: object | null;
  envPromptFile: string;
  invoke(panel: string, method: string, args: unknown[]): Promise<unknown>;
  stream(panel: string, socket: WorldStreamSocket): void;
}

export function buildQQConsole(state: QQConsoleState): WorldWebUiDecl {
  const lamps: WorldLamp[] = [
    {
      label: 'NapCat 连接',
      state: state.connected ? 'online' : state.config.mode === 'reverse' ? 'loading' : 'offline',
      hint: state.connected ? '已连接' : state.config.mode === 'reverse' ? '等待 NapCat 反向连入' : '未连接',
    },
    {
      label: '身份',
      state: state.identity ? 'online' : 'offline',
      hint: state.identity ? `QQ ${state.identity.selfId}（${state.identity.nickname}）` : '未加载',
    },
    {
      label: '群聊限速/防死循环',
      state: state.config.groupSpeak.enabled || state.config.antiLoop.enabled ? 'online' : 'offline',
      hint: `群发言限速=${state.config.groupSpeak.enabled ? `${state.config.groupSpeak.maxPerWindow}/${state.config.groupSpeak.windowSec}s` : '关'}；话题防死循环=${state.config.antiLoop.enabled ? `连续≤${state.config.antiLoop.maxConsecutiveBotTurns}/静默${state.config.antiLoop.idleToEndSec}s收尾` : '关'}`,
    },
  ];
  // 按模块拆分的控制台面板：每个模块一组完整可编辑配置（通用配置表单 + 运行时状态）。
  const modulePanels: Array<{ id: string; title: string; description: string; group: string; prefix: string; topOnly: boolean; status?: string; extra?: string }> = [
    { id: 'general', title: '连接与监听', description: 'OneBot 连接参数与监听名单；连接类改动需重启生效。', group: 'world:qqbot', prefix: '', topOnly: true },
    { id: 'vision', title: '视觉', description: '图片与视频理解：主模型看图优先，视频按间隔抽帧拼图；主模型不支持图片时可回退到辅助 VLM。', group: 'world:qqbot', prefix: 'worlds.qqbot.vision.', topOnly: false },
    { id: 'sticker', title: '表情包', description: '自动收藏表情包：下载消息里的图片并标注情感/用处。', group: 'world:qqbot', prefix: 'worlds.qqbot.sticker.', topOnly: false },
    { id: 'proactive', title: '主动说话', description: '后台按状态机向监听会话主动冒泡闲聊（移植自 fat-fish ProactiveSpeaker）。', group: 'world:qqbot', prefix: 'worlds.qqbot.proactive.', topOnly: false },
    { id: 'qzone', title: 'QQ空间', description: 'QQ 空间动态发布、自动冒泡与评论回复。', group: 'world:qqbot', prefix: 'worlds.qqbot.qzone.', topOnly: false },
    { id: 'group-speak', title: '群聊限速', description: '限制每个群在单位窗口内被 bot 发出的消息总量，防刷屏/死循环。', group: 'world:qqbot', prefix: 'worlds.qqbot.groupSpeak.', topOnly: false },
    { id: 'anti-loop', title: '防刷/话题结束', description: '统计单会话 bot 连续发言次数与对方静默时长，超限自动收尾。', group: 'world:qqbot', prefix: 'worlds.qqbot.antiLoop.', topOnly: false },
    { id: 'routine', title: '作息功能', description: '按真实时间切换睡眠/午休/活跃状态，到点播报。', group: 'world:qqbot', prefix: 'worlds.qqbot.routine.', topOnly: false },
    { id: 'reminder', title: '到点提醒', description: '记下的定时提醒到点自动发到对应会话。', group: 'world:qqbot', prefix: 'worlds.qqbot.reminder.', topOnly: false },
    { id: 'admin', title: '群管理员', description: '群管理员能力：撤回/@全体/通知/审核进群/头衔/禁言/踢人。', group: 'world:qqbot', prefix: 'worlds.qqbot.admin.', topOnly: false },
    { id: 'voice', title: '语音收发', description: '对方说话转文字、AI 回复转语音。可整体开关，运行时状态见上方。', group: 'world:qqbot-voice', prefix: '', topOnly: false, status: 'getVoiceState' },
    { id: 'asr', title: '语音模型', description: 'ASR 引擎与模型下载：sherpa-onnx int8 量化版约 228MB，省内存更快。', group: 'world:qqbot-asr', prefix: '', topOnly: false, status: 'getAsrModelState', extra: 'asr' },
  ];
  const activeModulePanels = modulePanels;
  const toPanelDecl = (m: (typeof modulePanels)[number]): WorldPanelDecl => ({
    id: m.id,
    title: m.title,
    description: m.description,
    getMethods: ['config', ...(m.id === 'general' ? ['restartConnection', 'getReverseToken'] : []), ...(m.status ? [m.status] : []), ...(m.extra === 'asr' ? ['downloadAsrModel'] : [])],
  });
  // 面板顺序：连接与监听排第一（装完扩展第一件事就是配连接与监听），监听名单排第二，
  // 其余模块与「实时事件」保持原有相对顺序。
  const panels: WorldPanelDecl[] = [
    ...activeModulePanels.filter((m) => m.id === 'general').map(toPanelDecl),
    { id: 'roster', title: '监听名单', description: '当前监听的群与私聊及未读情况。', getMethods: ['getRoster'] },
    ...activeModulePanels.filter((m) => m.id !== 'general').map(toPanelDecl),
    { id: 'events', title: '实时事件', description: 'QQ 消息与通知的实时流。' },
  ];
  return {
    label: 'QQ 群聊',
    lamps: [...lamps],
    badges: [
      { label: '自身 QQ', value: state.identity?.selfId ?? '-', tone: 'on' },
      { label: '监听会话', value: state.convs.size, tone: 'on' },
      { label: '表情包', value: state.stickers?.size ?? 0, tone: 'on' },
      { label: '主动', value: state.proactive?.status().enabled ? '开' : '关', tone: state.proactive?.status().enabled ? 'on' : 'plain' },
      { label: '空间动态', value: state.qzone ? '开' : '关', tone: state.qzone ? 'on' : 'plain' },
      { label: '群限速', value: state.config.groupSpeak.enabled ? `开(${state.config.groupSpeak.maxPerWindow}/${state.config.groupSpeak.windowSec}s)` : '关', tone: state.config.groupSpeak.enabled ? 'on' : 'plain' },
      { label: '防死循环', value: state.config.antiLoop.enabled ? `开(≤${state.config.antiLoop.maxConsecutiveBotTurns})` : '关', tone: state.config.antiLoop.enabled ? 'on' : 'plain' },
      { label: '模式', value: state.config.mode === 'reverse' ? '反向' : '正向', tone: 'plain' },
    ],
    panels,
    invoke: (panel, method, args) => {
      return state.invoke(panel, method, args);
    },
    stream: (panel, socket) => {
      state.stream(panel, socket);
    },
    promptDocs: [
      {
        key: 'worlds.qqbot.envPrompt',
        title: 'QQ 环境描述',
        description: '注入 system 前缀的 QQ 身份与监听名单说明。',
        role: 'envPrompt',
        path: state.envPromptFile,
        vars: [
          { name: 'qq.self', description: '当前 QQ 身份说明。' },
          { name: 'qq.activeGroups', description: '正在监听的群列表。', multiline: true },
          { name: 'qq.activePrivates', description: '正在监听的私聊列表。', multiline: true },
          { name: 'qq.unread', description: '未读摘要。' },
          { name: 'qq.now', description: '当前时间（时区见配置），用于回答"现在几点/星期几/几号"等问题。' },
          { name: 'qq.festival', description: '今天是什么日子：公历/农历节日、二十四节气（按配置时区推算），用于让主动说话自然呼应今天；可能为空（平日无节日）。', multiline: true },
          { name: 'qq.voice', description: '语音能力说明：对方明确要求语音时回复会被转成语音消息，且那正是你自己说的，别误认成对方发的、也别以为没发出去。', multiline: true },
          { name: 'qq.qzone', description: 'QQ 空间动态能力说明（是否开启、可用工具）。', multiline: true },
          { name: 'qq.groupSpeak', description: '群聊发言限速说明（是否开启、窗口与上限）。' },
          { name: 'qq.antiLoop', description: '话题防死循环规则说明（连续发言上限、静默收尾、何时该停）。' },
          { name: 'qq.routine', description: 'AI 作息说明（当前时段、是否在线/睡眠/午休，以及主动冒泡规则）。' },
        ],
      },
    ],
    links: [],
    config: [QQ_CONFIG_GROUP, QQ_VOICE_GROUP, QQ_ASR_GROUP],
  };
}
