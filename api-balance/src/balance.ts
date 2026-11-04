/**
 * Balance endpoints and response parsing.
 *
 * This module is deliberately unaware of World configuration and UI. It takes
 * one provider, one key and a fetch implementation, and returns a normalized
 * report or a `BalanceError`. Nothing here writes the key anywhere.
 */
import { providerById, type ProviderId, type ResolvedProvider } from './providers.ts';

export type BalanceErrorCode =
  | 'missing-key'
  | 'auth'
  | 'rate-limit'
  | 'network'
  | 'timeout'
  | 'http'
  | 'format'
  | 'unsupported';

export class BalanceError extends Error {
  readonly code: BalanceErrorCode;
  readonly status?: number;

  constructor(code: BalanceErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'BalanceError';
    this.code = code;
    this.status = status;
  }
}

export type BalanceLineKey =
  | 'total'
  | 'granted'
  | 'topped-up'
  | 'available'
  | 'voucher'
  | 'cash'
  | 'charge'
  | 'remaining'
  | 'usage'
  | 'credits';

export interface BalanceLine {
  key: BalanceLineKey;
  label: string;
  amount: number;
  currency: string;
}

export interface BalanceReport {
  provider: ProviderId;
  providerLabel: string;
  /** First reported currency; each line keeps its own currency. */
  currency: string;
  lines: BalanceLine[];
  /** False when the platform says the account cannot make API calls. */
  available: boolean;
  fetchedAt: string;
}

export interface FetchBalanceOptions {
  provider: ProviderId;
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Request timeout in milliseconds; default 10 s. */
  timeoutMs?: number;
  now?: () => Date;
}

interface HttpResponse {
  status: number;
  body: unknown;
  text: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function requiredNum(value: unknown, field: string): number {
  const parsed = num(value);
  if (parsed === undefined) throw new BalanceError('format', `响应里没有可读的 ${field}。`);
  return parsed;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function short(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

/** Remove the exact key and anything that looks like an `sk-…` token from a message. */
export function redact(text: string, key?: string): string {
  if (!text) return '';
  let out = text;
  if (key) out = out.split(key).join('[redacted]');
  return out.replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-[redacted]');
}

/** Pull a human-readable error out of the common response shapes. */
function extractError(body: unknown): string {
  const root = asObject(body);
  const error = root.error;
  if (typeof error === 'string') return error;
  const errorObject = asObject(error);
  if (typeof errorObject.message === 'string') return errorObject.message;
  for (const field of ['message', 'msg', 'detail']) {
    if (typeof root[field] === 'string') return root[field] as string;
  }
  return '';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function requestJson(
  url: string,
  apiKey: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<HttpResponse> {
  const timeout = Math.max(1000, Math.trunc(timeoutMs));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: 'application/json',
          'user-agent': 'coopanion-api-balance/0.1.0',
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new BalanceError('timeout', `请求超时（${Math.round(timeout / 1000)} 秒），连不上 ${hostOf(url)}。`);
      }
      throw new BalanceError('network', `连不上 ${hostOf(url)}：${short(errorMessage(error))}`);
    }

    let text = '';
    try {
      text = await response.text();
    } catch {
      // A status-only response is still useful; the parser reports missing fields.
    }
    let body: unknown;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }
    return { status: response.status, body, text };
  } finally {
    clearTimeout(timer);
  }
}

function ensureHttpOk(response: HttpResponse, provider: ResolvedProvider, apiKey: string): void {
  const { status } = response;
  if (status >= 200 && status < 300) return;

  const detail = short(redact(extractError(response.body) || response.text, apiKey));
  const suffix = detail ? `（${detail}）` : '';

  if (status === 401) {
    throw new BalanceError(
      'auth',
      `${provider.label} API Key 无效、过期或没有权限（HTTP 401）${suffix}`,
      status,
    );
  }
  if (status === 403) {
    if (provider.api === 'openrouter') {
      throw new BalanceError(
        'auth',
        `OpenRouter 余额接口只接受 Management Key；普通推理 Key 会返回 403${suffix}`,
        status,
      );
    }
    throw new BalanceError(
      'auth',
      `${provider.label} API Key 没有查看余额的权限（HTTP 403）${suffix}`,
      status,
    );
  }
  if (status === 429) {
    throw new BalanceError('rate-limit', `请求太频繁（HTTP 429），稍后再试${suffix}`, status);
  }
  if (status >= 500) {
    throw new BalanceError('http', `${provider.label} 服务暂时不可用（HTTP ${status}）${suffix}`, status);
  }
  throw new BalanceError('http', `查询失败（HTTP ${status}）${suffix}`, status);
}

/**
 * Moonshot and SiliconFlow can return HTTP 200 with a business error code.
 * Treat their documented success codes as success and map the rest.
 */
function checkBusinessCode(root: Record<string, unknown>, provider: ResolvedProvider): void {
  const code = num(root.code);
  if (code === undefined || code === 0 || code === 20000) {
    if (root.status === false) {
      throw new BalanceError('http', `${provider.label} 返回 status=false：${short(extractError(root) || '没有更多说明')}`);
    }
    return;
  }

  const detail = short(extractError(root) || `code=${code}`);
  if (code === 401 || code === 403) {
    throw new BalanceError(
      'auth',
      `${provider.label} API Key 无效、过期或没有权限（code ${code}）：${detail}`,
    );
  }
  if (code === 429) {
    throw new BalanceError('rate-limit', `请求太频繁（code 429）：${detail}`);
  }
  throw new BalanceError('http', `${provider.label} 返回错误（code ${code}）：${detail}`);
}

function parseDeepSeek(root: Record<string, unknown>, provider: ResolvedProvider, fetchedAt: string): BalanceReport {
  const infos = Array.isArray(root.balance_infos) ? root.balance_infos : [];
  const lines: BalanceLine[] = [];

  for (const item of infos) {
    const info = asObject(item);
    const currency = typeof info.currency === 'string' && info.currency.trim()
      ? info.currency.trim().toUpperCase()
      : provider.currency;
    const total = num(info.total_balance);
    if (total === undefined) continue;

    lines.push({ key: 'total', label: '总余额', amount: total, currency });
    const granted = num(info.granted_balance);
    if (granted !== undefined) lines.push({ key: 'granted', label: '赠金', amount: granted, currency });
    const toppedUp = num(info.topped_up_balance);
    if (toppedUp !== undefined) lines.push({ key: 'topped-up', label: '充值', amount: toppedUp, currency });
  }

  if (!lines.length) {
    throw new BalanceError('format', 'DeepSeek 响应里没有 balance_infos 或可读的 total_balance。');
  }

  const primary = lines[0]!;
  const available = typeof root.is_available === 'boolean'
    ? root.is_available
    : primary.amount > 0;

  return {
    provider: provider.id,
    providerLabel: provider.label,
    currency: primary.currency,
    lines,
    available,
    fetchedAt,
  };
}

function parseMoonshot(root: Record<string, unknown>, provider: ResolvedProvider, fetchedAt: string): BalanceReport {
  checkBusinessCode(root, provider);
  const data = asObject(root.data);
  const availableBalance = requiredNum(data.available_balance, 'available_balance');
  const voucher = num(data.voucher_balance) ?? 0;
  const cash = num(data.cash_balance) ?? 0;
  const currency = provider.currency;

  return {
    provider: provider.id,
    providerLabel: provider.label,
    currency,
    lines: [
      { key: 'available', label: '可用余额', amount: availableBalance, currency },
      { key: 'voucher', label: '代金券', amount: voucher, currency },
      { key: 'cash', label: '现金余额', amount: cash, currency },
    ],
    available: availableBalance > 0,
    fetchedAt,
  };
}

function parseSiliconFlow(root: Record<string, unknown>, provider: ResolvedProvider, fetchedAt: string): BalanceReport {
  checkBusinessCode(root, provider);
  const data = asObject(root.data);
  const total = requiredNum(data.totalBalance, 'totalBalance');
  const charge = num(data.chargeBalance) ?? 0;
  const gift = num(data.balance) ?? 0;
  const currency = provider.currency;
  const status = typeof data.status === 'string' ? data.status : '';
  const available = total > 0 && status !== 'banned' && status !== 'disabled';

  return {
    provider: provider.id,
    providerLabel: provider.label,
    currency,
    lines: [
      { key: 'total', label: '总余额', amount: total, currency },
      { key: 'charge', label: '充值余额', amount: charge, currency },
      { key: 'granted', label: '赠送余额', amount: gift, currency },
    ],
    available,
    fetchedAt,
  };
}

function parseOpenRouter(root: Record<string, unknown>, provider: ResolvedProvider, fetchedAt: string): BalanceReport {
  const data = asObject(root.data);
  const credits = requiredNum(data.total_credits, 'total_credits');
  const used = requiredNum(data.total_usage, 'total_usage');
  const remaining = round2(credits - used);
  const currency = 'USD';

  return {
    provider: provider.id,
    providerLabel: provider.label,
    currency,
    lines: [
      { key: 'remaining', label: '剩余额度', amount: remaining, currency },
      { key: 'usage', label: '已用', amount: used, currency },
      { key: 'credits', label: '购买总额', amount: credits, currency },
    ],
    available: remaining > 0,
    fetchedAt,
  };
}

/**
 * Query one provider. Throws `BalanceError`; the caller decides how to phrase it.
 */
export async function fetchBalance(options: FetchBalanceOptions): Promise<BalanceReport> {
  const provider = providerById(options.provider);
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new BalanceError('missing-key', `没有配置 ${provider.label} 的 API Key。`);
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new BalanceError('unsupported', '当前运行环境没有 fetch，无法查询余额。');
  }

  const fetchedAt = (options.now ?? (() => new Date()))().toISOString();
  const response = await requestJson(provider.url, apiKey, options.timeoutMs ?? 10_000, fetchImpl);
  ensureHttpOk(response, provider, apiKey);

  const root = asObject(response.body);
  switch (provider.api) {
    case 'deepseek':
      return parseDeepSeek(root, provider, fetchedAt);
    case 'moonshot':
      return parseMoonshot(root, provider, fetchedAt);
    case 'siliconflow':
      return parseSiliconFlow(root, provider, fetchedAt);
    case 'openrouter':
      return parseOpenRouter(root, provider, fetchedAt);
    default:
      throw new BalanceError('unsupported', `暂不支持 ${provider.label} 的余额接口。`);
  }
}

/** Manual thousands separators, independent of the host's ICU data. */
function groupNumber(amount: number): string {
  const fixed = (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
  const [whole, fraction] = fixed.split('.');
  const negative = whole!.startsWith('-');
  const digits = negative ? whole!.slice(1) : whole!;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${fraction}`;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  return `${amount < 0 ? '-' : ''}${symbol}${groupNumber(Math.abs(amount))}`;
}

export function primaryLine(report: BalanceReport): BalanceLine | undefined {
  return report.lines.find((line) => line.key === 'total' || line.key === 'available' || line.key === 'remaining')
    ?? report.lines[0];
}

export function primaryText(report: BalanceReport): string {
  const line = primaryLine(report);
  return line ? formatMoney(line.amount, line.currency) : '—';
}

/** A compact, fact-only block for the model; it must not add or hide amounts. */
export function formatReport(report: BalanceReport): string {
  const lines = report.lines.map((line) => `- ${line.label}：${formatMoney(line.amount, line.currency)}`);
  const status = report.available
    ? '余额可用，可以继续调用 API。'
    : '余额不足或账户不可用，API 调用可能失败，需要充值。';
  return [`${report.providerLabel} 账户余额：`, ...lines, status].join('\n');
}

export interface ErrorText {
  code: BalanceErrorCode | 'unknown';
  message: string;
}

/** Normalize any thrown value into a redacted code + message pair. */
export function errorText(error: unknown, apiKey?: string): ErrorText {
  if (error instanceof BalanceError) {
    return { code: error.code, message: redact(error.message, apiKey) };
  }
  return { code: 'unknown', message: redact(errorMessage(error), apiKey) };
}
