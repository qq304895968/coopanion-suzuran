import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { createAdminTool, type AdminToolState } from '../src/admin-tools.ts';
import { QQ_DEFAULTS } from '../src/config.ts';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
afterEach(() => vi.useRealTimers());
function setup() {
  const cfg = structuredClone(QQ_DEFAULTS);
  Object.assign(cfg.admin, { enabled: true, allowSelf: false, allowSelfKick: false, allowGroupAdmins: false, allowlist: [], protectOwner: true, protectAdmins: true });
  const callApi = vi.fn(async () => ({}));
  const getMemberInfo = vi.fn(async () => ({ nickname: 'fixture', role: 'member' }));
  const callers = new Map<string, { userId: number; at: number }>();
  const state: AdminToolState = {
    config: cfg,
    driver: { callApi, getMemberInfo } as unknown as AdminToolState['driver'],
    identity: { selfId: 999 }, pendingReplyConvs: new Set(['group:123']), callerByConv: callers,
    pendingJoinRequests: new Map(), fallbackTarget: () => null, resolveQQ: async () => null,
  };
  const tool = createAdminTool(state);
  const call = (args: Record<string, unknown>) => tool.handler({ group: '123', ...args }, { role: 'session:test' } as ToolCallContext);
  return { cfg, callers, callApi, getMemberInfo, call };
}

describe('group administration boundary', () => {
  it('rejects disabled administration and unidentified callers', async () => {
    const { call, cfg, callApi } = setup();
    cfg.admin.enabled = false;
    expect(await call({ action: 'ban_all', enable: true })).toContain('未开启');
    cfg.admin.enabled = true;
    expect(await call({ action: 'ban_all', enable: true })).toContain('无法确定');
    expect(callApi).not.toHaveBeenCalled();
  });

  it('accepts fresh allowlisted callers, but not their stale identity', async () => {
    const { cfg, callers, call, callApi } = setup();
    cfg.admin.allowlist = ['42'];
    callers.set('group:123', { userId: 42, at: Date.now() });
    expect(await call({ action: 'ban_all', enable: true })).toContain('OK');
    expect(callApi).toHaveBeenCalledWith('set_group_whole_ban', { group_id: 123, enable: true });
    vi.advanceTimersByTime(120_001);
    expect(await call({ action: 'ban_all', enable: true })).toContain('无法确定');
    expect(callApi).toHaveBeenCalledTimes(1);
  });

  it('never lets autonomous operation kick by default', async () => {
    const { cfg, call, callApi } = setup();
    cfg.admin.allowSelf = true;
    expect(await call({ action: 'kick', who: '52' })).toContain('不能自主踢人');
    expect(callApi).not.toHaveBeenCalled();
  });

  it('protects the group owner even against an allowlisted caller', async () => {
    const { cfg, callers, call, callApi, getMemberInfo } = setup();
    cfg.admin.allowlist = ['42'];
    callers.set('group:123', { userId: 42, at: Date.now() });
    getMemberInfo.mockResolvedValue({ nickname: 'owner', role: 'owner' });
    expect(await call({ action: 'kick', who: '52' })).toContain('群主');
    expect(callApi).not.toHaveBeenCalled();
  });
});
