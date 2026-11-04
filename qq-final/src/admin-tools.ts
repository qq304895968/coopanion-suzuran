/** Group administration policy and tool. No sockets or timers are started here. */
import type { ToolCallContext, ToolDef } from 'cortico/core/types.ts';
import type { QQWorldConfig } from './config.ts';
import type { OneBotDriver } from './driver.ts';
import type { QQIdentity } from './types.ts';

export interface PendingJoinRequest {
  flag: string; groupId: number; userId: number; comment: string; subType: string; ts: number;
}
export interface AdminToolState {
  readonly config: QQWorldConfig;
  readonly driver: Pick<OneBotDriver, 'getMemberInfo' | 'callApi'> | null;
  readonly identity: Pick<QQIdentity, 'selfId'> | null;
  readonly pendingReplyConvs: ReadonlySet<string>;
  readonly callerByConv: ReadonlyMap<string, { userId: number; at: number }>;
  readonly pendingJoinRequests: Map<string, PendingJoinRequest>;
  fallbackTarget(groupId: number | null): number | null;
  resolveQQ(groupId: number | null, who: string): Promise<number | null>;
}

export function createAdminTool(state: AdminToolState): ToolDef {
  // ===================== 群管理员能力（admin.enabled 控制是否生效） =====================
  const adminEnabled = (): string | null => (
    state.config.admin.enabled ? null : '管理员功能未开启（在控制台开启 worlds.qqbot.admin.enabled 后即可使用）。'
  );

  interface AuthResult {
    ok: boolean;
    text?: string;
    gid?: number;
    callerId?: number;
    callerRole?: string;
  }

  const resolveGroup = (value: unknown): { gid: number; err?: string } => {
    const raw = typeof value === 'string' && value.trim().startsWith('group:')
      ? value.trim().slice('group:'.length)
      : value;
    const gid = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
    if (!Number.isSafeInteger(gid) || gid <= 0) {
      return { gid: 0, err: `无法识别的群标识：${String(value)}（填群号或 group:<群号>）` };
    }
    return { gid };
  };

  /** ToolCallContext.role 是 session id，不是 QQ 会话地址；当前会话从本轮待回复集合中取。 */
  const activeAdminConversation = (): string | undefined => {
    const now = Date.now();
    return [...state.pendingReplyConvs]
      .map((address) => ({ address, caller: state.callerByConv.get(address) }))
      .filter((x) => x.caller && now - x.caller.at < 120_000)
      .sort((a, b) => (b.caller!.at - a.caller!.at))[0]?.address;
  };

  /** 管理员操作只接受当前会话两分钟内的指挥官，避免陈旧身份串台。 */
  const adminAuthorize = async (ctx: ToolCallContext, args: Record<string, unknown>): Promise<AuthResult> => {
    if (!state.config.admin.enabled) return { ok: false, text: '管理员功能未开启（在控制台开启 worlds.qqbot.admin.enabled 后即可使用）。' };
    const conv = activeAdminConversation();
    const explicitGroup = args.group;
    const fallbackGroup = conv ?? (ctx.role.startsWith('group:') ? ctx.role : undefined);
    const rg = resolveGroup(explicitGroup ?? fallbackGroup);
    if (rg.err) return { ok: false, text: rg.err };
    const gid = rg.gid;
    const cfg = state.config.admin;
    const caller = conv ? state.callerByConv.get(conv) : undefined;
    const fresh = caller && Date.now() - caller.at < 120_000 ? caller : undefined;
    const callerId = fresh?.userId;
    if (callerId == null) {
      return cfg.allowSelf
        ? { ok: true, gid, callerRole: 'self' }
        : { ok: false, text: '无法确定命令来源：仅当有人在群里 @ 你或在群里说话时，才能触发管理操作（防滥用）。' };
    }
    const callerStr = String(callerId);
    if (Array.isArray(cfg.allowlist) && cfg.allowlist.map(String).includes(callerStr)) {
      return { ok: true, gid, callerId, callerRole: 'allowlisted' };
    }
    const driver = state.driver;
    if (cfg.allowGroupAdmins && driver) {
      const info = await driver.getMemberInfo(gid, callerId);
      const role = info?.role || 'member';
      const allowed = cfg.ownerOnly ? role === 'owner' : role === 'owner' || role === 'admin';
      if (allowed) return { ok: true, gid, callerId, callerRole: role };
    }
    if (!cfg.allowGroupAdmins) {
      return { ok: false, text: `群管理员指挥未开启，且你（QQ ${callerStr}）不在授权白名单中，无法命令我执行管理操作。` };
    }
    const info = driver ? await driver.getMemberInfo(gid, callerId) : null;
    const role = info?.role || 'member';
    return { ok: false, text: `你（QQ ${callerStr}，群内身份=${role}）没有管理员权限，不能命令我执行管理操作。` };
  };

  /** 保护群主和管理员，避免普通管理员借 bot 越权操作。 */
  const protectTarget = async (gid: number, targetUid: number, callerRole?: string): Promise<string | null> => {
    const cfg = state.config.admin;
    if (!cfg.protectOwner && !cfg.protectAdmins) return null;
    const driver = state.driver;
    if (!driver) return null;
    const info = await driver.getMemberInfo(gid, targetUid);
    const role = info?.role || 'member';
    if (cfg.protectOwner && role === 'owner') return '不能对群主执行该操作（受保护）。';
    if (cfg.protectAdmins && role === 'admin' && callerRole !== 'owner') return '只有群主才能对该管理员执行该操作（受保护）。';
    return null;
  };

  const resolveUser = async (gid: number, who: unknown): Promise<{ uid: number; err?: string }> => {
    const value = typeof who === 'string' ? who.trim() : String(who ?? '');
    if (!value) return { uid: 0, err: '目标用户不能为空（填昵称或 QQ 号）' };
    if (/^\d+$/.test(value)) {
      const uid = Number(value);
      if (Number.isSafeInteger(uid) && uid > 0) return { uid };
    }
    const uid = await state.resolveQQ(gid, value);
    if (!uid) return { uid: 0, err: `在群 ${gid} 里找不到叫「${value}」的成员（确认昵称、改用 QQ 号，或在记忆里记一下这个外号对应谁）` };
    return { uid };
  };

  const api = async (action: string, params: Record<string, unknown>): Promise<{ ok: boolean; text: string }> => {
    const driver = state.driver;
    if (!driver) return { ok: false, text: '未连接到 NapCat，无法执行管理员操作。' };
    try {
      await driver.callApi(action, params);
      return { ok: true, text: `OK (${action})` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, text: `操作失败（${action}）：${msg}` };
    }
  };

  const adminTool: ToolDef = {
    name: 'qq_admin',
    tags: ['write', 'read'],
    barrierAfter: true,
    description:
      '【群管理员】系列（用一个 action 选子功能，需 admin.enabled 开启；部分操作需授权指挥官：控制台白名单 / 群管理员 / 群主，或开启 admin.allowSelf 让 AI 自主）：' +
      'recall=撤回一条群消息（messageId，最近2分钟内或自己发的）；' +
      'at_all=@全体成员（text 附带正文）；' +
      'notice=发布群公告（content）；' +
      'join_list=列出待审核加群请求；' +
      'join_approve=通过加群请求（flag）；' +
      'join_reject=拒绝加群请求（flag, reason?）；' +
      'title=设置群专属头衔（who, title）；' +
      'ban=禁言/解禁成员（who, durationSec?）；' +
      'ban_all=全员禁言开关（enable）；' +
      'kick=踢出成员（who, rejectRejoin?，高影响且不可逆，默认 AI 不能自主踢人）。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['recall', 'at_all', 'notice', 'join_list', 'join_approve', 'join_reject', 'title', 'ban', 'ban_all', 'kick'], description: '子功能，见上方描述。' },
        messageId: { type: 'string', description: '【recall】要撤回的 message_id（纯数字或 #123456）。' },
        text: { type: 'string', description: '【at_all/notice】@全体时的正文 / 群公告正文。' },
        content: { type: 'string', description: '【notice】群公告正文（同 text 的语义，保留兼容）。' },
        flag: { type: 'string', description: '【join_approve/join_reject】加群请求 flag。' },
        reason: { type: 'string', description: '【join_reject】拒绝理由（可选）。' },
        who: { type: 'string', description: '【title/ban/kick】成员昵称、QQ 号或外号；不填则默认最近被引用/@ 提及的人。' },
        title: { type: 'string', description: '【title】要设置的群头衔（空字符串清除）。' },
        durationSec: { type: 'number', description: '【ban】禁言时长（秒），默认 600，0=解禁。' },
        enable: { type: 'boolean', description: '【ban_all】true=开启全员禁言，false=关闭。' },
        rejectRejoin: { type: 'boolean', description: '【kick】true=踢出并拒绝再次加群（默认），false=仅踢出。' },
        group: { type: 'string', description: '群号或 group:<群号>；不填用当前会话所在群。' },
      },
      required: ['action'],
    },
    handler: async (args, ctx) => {
      const action = String(args.action ?? '');
      switch (action) {
        case 'recall': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const raw = typeof args.messageId === 'string' ? args.messageId.replace(/^#/, '').trim() : String(args.messageId ?? '');
          const messageId = Number(raw);
          if (!Number.isFinite(messageId)) return 'messageId 无效（应为数字 message_id，例如消息开头的 #123456）。';
          const res = await api('delete_msg', { message_id: messageId });
          return res.text;
        }
        case 'at_all': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const text = typeof args.text === 'string' ? args.text : '';
          const driver = state.driver;
          if (!driver) return '未连接到 NapCat，无法发送。';
          try {
            await driver.callApi('send_group_msg', { group_id: auth.gid!, message: [{ type: 'at', data: { qq: 'all' } }, { type: 'text', data: { text: text ? text : '' } }] });
            return `已向群 ${auth.gid} @全体成员。`;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return `发送失败：${msg}（@全体成员需要管理员权限且群设置允许）`;
          }
        }
        case 'notice': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const content = typeof args.content === 'string' ? args.content : (typeof args.text === 'string' ? args.text : '');
          if (!content.trim()) return '公告内容不能为空。';
          const res = await api(state.config.admin.noticeAction || 'send_group_notice', { group_id: auth.gid!, content });
          return res.text;
        }
        case 'join_list': {
          const e = adminEnabled();
          if (e) return e;
          if (!state.config.admin.allowJoin) return '未开启自动审核加群（在控制台开启 worlds.qqbot.admin.allowJoin 后即可处理）。';
          if (state.pendingJoinRequests.size === 0) return '当前没有待审核的加群请求。';
          const items = [...state.pendingJoinRequests.values()].map((r) => `#${r.flag} 群${r.groupId} 申请人QQ${r.userId}（${r.subType === 'invite' ? '邀请' : '申请'}）；申请留言已省略，外部原文不作为模型指令`);
          return '待审核加群请求：\n' + items.join('\n');
        }
        case 'join_approve': {
          const e = adminEnabled();
          if (e) return e;
          if (!state.config.admin.allowJoin) return '未开启自动审核加群（在控制台开启 worlds.qqbot.admin.allowJoin 后即可处理）。';
          const flag = typeof args.flag === 'string' ? args.flag.trim().replace(/^#/, '') : '';
          if (!flag) return 'flag 不能为空。';
          const req0 = state.pendingJoinRequests.get(flag);
          if (!req0) return `没找到 flag=${flag} 的待审请求（可能已处理或已过期）。`;
          const res = await api('set_group_add_request', { flag, sub_type: req0.subType, approve: true });
          if (res.ok) state.pendingJoinRequests.delete(flag);
          return res.text;
        }
        case 'join_reject': {
          const e = adminEnabled();
          if (e) return e;
          if (!state.config.admin.allowJoin) return '未开启自动审核加群（在控制台开启 worlds.qqbot.admin.allowJoin 后即可处理）。';
          const flag = typeof args.flag === 'string' ? args.flag.trim().replace(/^#/, '') : '';
          if (!flag) return 'flag 不能为空。';
          const req0 = state.pendingJoinRequests.get(flag);
          if (!req0) return `没找到 flag=${flag} 的待审请求（可能已处理或已过期）。`;
          const res = await api('set_group_add_request', { flag, sub_type: req0.subType, approve: false, reason: typeof args.reason === 'string' ? args.reason : '' });
          if (res.ok) state.pendingJoinRequests.delete(flag);
          return res.text;
        }
        case 'title': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const gid = auth.gid!;
          const whoProvided = typeof args.who === 'string' && args.who.trim();
          const fb = !whoProvided ? state.fallbackTarget(gid) : null;
          const whoRaw = whoProvided || (fb ? String(fb) : '');
          const ru = await resolveUser(gid, whoRaw);
          if (ru.err) return ru.err;
          const prot = await protectTarget(gid, ru.uid, auth.callerRole);
          if (prot) return prot;
          const title = typeof args.title === 'string' ? args.title : '';
          const res = await api('set_group_special_title', { group_id: gid, user_id: ru.uid, special_title: title });
          return res.text;
        }
        case 'ban': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const gid = auth.gid!;
          const whoProvided = typeof args.who === 'string' && args.who.trim();
          const fb = !whoProvided ? state.fallbackTarget(gid) : null;
          const whoRaw = whoProvided || (fb ? String(fb) : '');
          const ru = await resolveUser(gid, whoRaw);
          if (ru.err) return ru.err;
          const prot = await protectTarget(gid, ru.uid, auth.callerRole);
          if (prot) return prot;
          const dur = typeof args.durationSec === 'number' && Number.isFinite(args.durationSec) ? Math.max(0, Math.floor(args.durationSec)) : 600;
          const res = await api('set_group_ban', { group_id: gid, user_id: ru.uid, duration: dur });
          return res.text;
        }
        case 'ban_all': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const enable = args.enable === true;
          const res = await api('set_group_whole_ban', { group_id: auth.gid!, enable });
          return res.text;
        }
        case 'kick': {
          const auth = await adminAuthorize(ctx, args);
          if (!auth.ok) return auth.text ?? '未授权执行该管理操作。';
          const gid = auth.gid!;
          if (auth.callerRole === 'self' && !state.config.admin.allowSelfKick) {
            return '踢人属于高影响且不可逆的操作，需要授权指挥官（白名单/群管理员/群主）在对话里明确下令；AI 不能自主踢人（控制台开启 admin.allowSelfKick 可放行）。';
          }
          const whoProvided = typeof args.who === 'string' && args.who.trim();
          const fb = !whoProvided ? state.fallbackTarget(gid) : null;
          const whoRaw = whoProvided || (fb ? String(fb) : '');
          if (!whoRaw) return '未指定要踢出的人：请给出昵称、QQ 号或外号，或在群里 @ / 引用该成员后再让我踢。';
          const ru = await resolveUser(gid, whoRaw);
          if (ru.err) return ru.err;
          if (ru.uid === state.identity?.selfId) return '不能把我自己踢出群（换个人吧）。';
          const prot = await protectTarget(gid, ru.uid, auth.callerRole);
          if (prot) return prot;
          const reject = typeof args.rejectRejoin === 'boolean' ? args.rejectRejoin : state.config.admin.kickRejectRejoin;
          const res = await api('set_group_kick', { group_id: gid, user_id: ru.uid, reject_add_request: reject });
          return res.ok ? `已把 ${ru.uid} 踢出群 ${gid}${reject ? '（并拒绝其再次加群）' : ''}。` : res.text;
        }
        default:
          return `未知 action：「${action}」（支持 recall/at_all/notice/join_list/join_approve/join_reject/title/ban/ban_all/kick）。`;
      }
    },
  };

  return adminTool;
}
