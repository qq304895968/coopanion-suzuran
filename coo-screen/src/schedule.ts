/**
 * 「主动看一眼」的时间判断。全是纯函数,好测,也好在日志里说清这一拍为什么没看。
 */

export interface Clock {
  /** 部署时区里的 YYYY-MM-DD。 */
  date: string;
  /** 0–1439。 */
  minutes: number;
  /** HH:mm。 */
  time: string;
}

export function clockIn(timezone: string, now: Date = new Date()): Clock {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) parts[part.type] = part.value;
  const year = parts.year ?? '1970';
  const month = parts.month ?? '01';
  const day = parts.day ?? '01';
  const hour = Number(parts.hour ?? '0') % 24; // 某些实现给 "24" 表示午夜
  const minute = Number(parts.minute ?? '0');
  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export interface QuietRange {
  start: number;
  end: number;
}

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** `23:00-08:00` → {start:1380, end:480};格式不对返回 null(当成没设置)。 */
export function parseQuietHours(text: string): QuietRange | null {
  const raw = (text ?? '').trim();
  if (!raw) return null;
  const [from, to, ...rest] = raw.split('-');
  if (rest.length || from === undefined || to === undefined) return null;
  const a = HHMM.exec(from.trim());
  const b = HHMM.exec(to.trim());
  if (!a || !b) return null;
  return {
    start: Number(a[1]) * 60 + Number(a[2]),
    end: Number(b[1]) * 60 + Number(b[2]),
  };
}

export function inQuietHours(range: QuietRange | null, minutes: number): boolean {
  if (!range) return false;
  const { start, end } = range;
  if (start === end) return false; // 起止一样 = 没有安静时段
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end; // 跨午夜
}

export interface GlanceState {
  enabled: boolean;
  /** 侧车就绪,能抓。 */
  ready: boolean;
  /** 主模型正在跑一轮(别插嘴)。 */
  modelBusy: boolean;
  /** 今天已经主动看过几次。 */
  todayCount: number;
  dailyQuota: number;
  nowMs: number;
  /** 上次主动看的时间(毫秒);0 表示今天还没看。 */
  lastGlanceMs: number;
  /** 上次任何一次截图(热键、工具、主动)的时间。 */
  lastShotMs: number;
  everyMinutes: number;
  /** 用户多久没碰键鼠。 */
  idleMs: number;
  /** 超过这个时长就当人不在,别对着空屏说话。 */
  maxIdleMs: number;
  quiet: boolean;
}

export type GlanceDecision = { ok: true } | { ok: false; reason: string };

export function shouldGlance(s: GlanceState): GlanceDecision {
  if (!s.enabled) return { ok: false, reason: '没开主动看一眼' };
  if (!s.ready) return { ok: false, reason: '侧车没就绪' };
  if (s.modelBusy) return { ok: false, reason: '模型正在跑一轮' };
  if (s.quiet) return { ok: false, reason: '在安静时段' };
  if (s.todayCount >= s.dailyQuota) return { ok: false, reason: `今天主动看过的次数用完了(${s.dailyQuota})` };
  const interval = Math.max(1, s.everyMinutes) * 60_000;
  if (s.lastGlanceMs && s.nowMs - s.lastGlanceMs < interval) {
    return { ok: false, reason: `距上次主动看还不够 ${s.everyMinutes} 分钟` };
  }
  if (s.lastShotMs && s.nowMs - s.lastShotMs < 10 * 60_000) {
    return { ok: false, reason: '十分钟内刚看过(热键或工具),不重复看' };
  }
  if (s.idleMs > s.maxIdleMs) {
    return { ok: false, reason: `人 ${Math.round(s.idleMs / 60_000)} 分钟没动,可能不在` };
  }
  return { ok: true };
}
