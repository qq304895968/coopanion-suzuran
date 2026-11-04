import { vi } from 'vitest';
import type { Logger } from 'cortico/core/types.ts';
import type { QQIdentity } from '../src/types.ts';

export function testLogger() {
  const log = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), emit: vi.fn(), child: () => log };
  return log as typeof log & Logger;
}
export function identity(): QQIdentity {
  return { selfId: 999, nickname: 'test bot', groups: new Map(), friends: new Map(), knownPeers: new Map(), nicknameConflicts: new Set(), loadedAt: 0 };
}
