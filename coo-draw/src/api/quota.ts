/**
 * 千问这边能查到的“额度”只有模型限流；账户余额要用登录态，API Key 没有那个接口。
 * 所以这里取两样东西：
 *   - /quotas：这个模型每几秒最多几次、排队/并发上限；
 *   - /models：当前每张图的价格，只用来把本地预算折算成“还能画几张”。
 * 返回值里没有金额文案，余额/预算的换算交给 World 用张数说。
 */
import { QWEN_API_BASE, QWEN_IMAGE_MODEL, safeMessage } from './draw.ts';

export const DEFAULT_PRICE_CNY = 0.18;
const QUOTA_TIMEOUT_MS = 15_000;

export interface ApiQuota {
  requestLimit?: number;
  requestPeriodSeconds?: number;
  queueLimit?: number;
  concurrencyLimit?: number;
  usageLimit?: number;
  usageLimitField?: string;
  usageLimitPeriodSeconds?: number;
  priceCny: number;
  fetchedAt: number;
  errors: string[];
}

interface JsonRecord {
  [key: string]: unknown;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function positive(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function getJson(url: string, apiKey: string, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUOTA_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${safeMessage(text)}`);
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 /models 的 prices 里找 1K 出图单价；找不到用默认值。 */
export function priceFromModels(payload: unknown): number | undefined {
  const models = asRecord(asRecord(payload)?.output)?.models;
  if (!Array.isArray(models)) return undefined;
  for (const model of models) {
    const row = asRecord(model);
    if (!row || row.model !== QWEN_IMAGE_MODEL) continue;
    const groups = row.prices;
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const prices = asRecord(group)?.prices;
      if (!Array.isArray(prices)) continue;
      for (const item of prices) {
        const price = asRecord(item);
        if (!price) continue;
        const type = String(price.type ?? '');
        if (type !== 'qima_output_1k' && type !== 'qima_output_2k') continue;
        const amount = Number(price.price);
        if (Number.isFinite(amount) && amount >= 0) return amount;
      }
    }
  }
  return undefined;
}

/** 从 /quotas 里取这个模型的限流；取不到时返回空对象。 */
export function limitsFromQuotas(payload: unknown): Omit<ApiQuota, 'priceCny' | 'fetchedAt' | 'errors'> {
  const quotas = asRecord(asRecord(payload)?.output)?.quotas;
  if (!Array.isArray(quotas)) return {};
  for (const item of quotas) {
    const row = asRecord(item);
    if (!row || row.model !== QWEN_IMAGE_MODEL) continue;
    const limit = asRecord(row.model_limit) ?? {};
    return {
      requestLimit: positive(limit.request_limit),
      requestPeriodSeconds: positive(limit.request_limit_period),
      queueLimit: positive(limit.async_user_queue_limit),
      concurrencyLimit: positive(limit.async_user_concurrency_limit),
      usageLimit: positive(limit.usage_limit),
      usageLimitField: typeof limit.usage_limit_field === 'string' ? limit.usage_limit_field : undefined,
      usageLimitPeriodSeconds: positive(limit.usage_limit_period),
    };
  }
  return {};
}

/** 查一次 API 能查到的额度信息；失败的部分只记在 errors，不让调用方炸掉。 */
export async function fetchApiQuota(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiQuota> {
  const errors: string[] = [];
  let limits: Omit<ApiQuota, 'priceCny' | 'fetchedAt' | 'errors'> = {};
  let priceCny: number | undefined;

  try {
    const payload = await getJson(`${QWEN_API_BASE}/quotas?model=${encodeURIComponent(QWEN_IMAGE_MODEL)}`, apiKey, fetchImpl);
    limits = limitsFromQuotas(payload);
  } catch (error) {
    errors.push(`限流查询失败：${safeMessage(error)}`);
  }

  try {
    const payload = await getJson(`${QWEN_API_BASE}/models?model=${encodeURIComponent(QWEN_IMAGE_MODEL)}`, apiKey, fetchImpl);
    priceCny = priceFromModels(payload);
  } catch (error) {
    errors.push(`价格查询失败：${safeMessage(error)}`);
  }

  return {
    ...limits,
    priceCny: priceCny ?? DEFAULT_PRICE_CNY,
    fetchedAt: Date.now(),
    errors,
  };
}
