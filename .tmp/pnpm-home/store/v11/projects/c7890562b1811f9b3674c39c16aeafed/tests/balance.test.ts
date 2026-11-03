import { describe, expect, it } from 'vitest';
import {
  BalanceError,
  errorText,
  fetchBalance,
  formatMoney,
  formatReport,
  redact,
} from '../src/balance.ts';
import { providerById } from '../src/providers.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type FetchCall = { url: string; init?: RequestInit };

function fakeFetch(body: unknown, status = 200): { impl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return jsonResponse(body, status);
  }) as typeof fetch;
  return { impl, calls };
}

describe('fetchBalance', () => {
  it('parses DeepSeek CNY balance and keeps sub-amounts', async () => {
    const { impl, calls } = fakeFetch({
      is_available: true,
      balance_infos: [{
        currency: 'CNY',
        total_balance: '110.00',
        granted_balance: '10.00',
        topped_up_balance: '100.00',
      }],
    });

    const report = await fetchBalance({
      provider: 'deepseek',
      apiKey: 'sk-test-key',
      fetchImpl: impl,
      now: () => new Date('2026-10-29T03:40:00.000Z'),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.deepseek.com/user/balance');
    expect((calls[0]!.init?.headers as Record<string, string>).authorization).toBe('Bearer sk-test-key');
    expect(report.available).toBe(true);
    expect(report.fetchedAt).toBe('2026-10-29T03:40:00.000Z');
    expect(report.lines.map((line) => [line.label, line.amount, line.currency])).toEqual([
      ['总余额', 110, 'CNY'],
      ['赠金', 10, 'CNY'],
      ['充值', 100, 'CNY'],
    ]);
    expect(formatReport(report)).toContain('¥110.00');
  });

  it('keeps each DeepSeek currency separate', async () => {
    const { impl } = fakeFetch({
      is_available: true,
      balance_infos: [
        { currency: 'CNY', total_balance: '10.00' },
        { currency: 'USD', total_balance: '2.50', granted_balance: '0.50' },
      ],
    });
    const report = await fetchBalance({ provider: 'deepseek', apiKey: 'sk-test-key', fetchImpl: impl });
    expect(report.lines).toHaveLength(3);
    expect(formatReport(report)).toContain('¥10.00');
    expect(formatReport(report)).toContain('$2.50');
  });

  it('marks a DeepSeek account with is_available=false as unavailable', async () => {
    const { impl } = fakeFetch({
      is_available: false,
      balance_infos: [{ currency: 'CNY', total_balance: '0.00' }],
    });
    const report = await fetchBalance({ provider: 'deepseek', apiKey: 'sk-test-key', fetchImpl: impl });
    expect(report.available).toBe(false);
    expect(formatReport(report)).toContain('余额不足');
  });

  it('parses Kimi China balance in CNY', async () => {
    const { impl, calls } = fakeFetch({
      code: 0,
      data: { available_balance: 49.58894, voucher_balance: 46.58893, cash_balance: 3.00001 },
      scode: '0x0',
      status: true,
    });
    const report = await fetchBalance({ provider: 'moonshot', apiKey: 'sk-test-key', fetchImpl: impl });
    expect(calls[0]!.url).toBe('https://api.moonshot.cn/v1/users/me/balance');
    expect(report.currency).toBe('CNY');
    expect(report.lines.map((line) => line.label)).toEqual(['可用余额', '代金券', '现金余额']);
    expect(formatReport(report)).toContain('¥49.59');
  });

  it('parses SiliconFlow balance', async () => {
    const { impl, calls } = fakeFetch({
      code: 20000,
      message: 'OK',
      status: true,
      data: {
        totalBalance: '88.88',
        chargeBalance: '88.00',
        balance: '0.88',
        status: 'normal',
      },
    });
    const report = await fetchBalance({ provider: 'siliconflow', apiKey: 'sk-test-key', fetchImpl: impl });
    expect(calls[0]!.url).toBe('https://api.siliconflow.cn/v1/user/info');
    expect(report.lines.map((line) => [line.label, line.amount])).toEqual([
      ['总余额', 88.88],
      ['充值余额', 88],
      ['赠送余额', 0.88],
    ]);
    expect(report.available).toBe(true);
  });

  it('parses OpenRouter credits as remaining = purchased - used', async () => {
    const { impl, calls } = fakeFetch({ data: { total_credits: 100.5, total_usage: 25.75 } });
    const report = await fetchBalance({ provider: 'openrouter', apiKey: 'sk-test-key', fetchImpl: impl });
    expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/credits');
    expect(report.lines[0]).toMatchObject({ label: '剩余额度', amount: 74.75, currency: 'USD' });
    expect(report.available).toBe(true);
    expect(formatReport(report)).toContain('$74.75');
  });

  it('maps 401 to auth without leaking the key', async () => {
    const key = 'sk-secret-123456';
    const { impl } = fakeFetch({ error: { message: `Invalid key ${key}` } }, 401);
    let caught: unknown;
    try {
      await fetchBalance({ provider: 'deepseek', apiKey: key, fetchImpl: impl });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BalanceError);
    const err = caught as BalanceError;
    expect(err.code).toBe('auth');
    expect(err.message).not.toContain(key);
    expect(err.message).toContain('sk-[redacted]');
  });

  it('explains the OpenRouter management-key restriction on 403', async () => {
    const { impl } = fakeFetch({ error: { message: 'Only management keys can perform this operation' } }, 403);
    await expect(fetchBalance({ provider: 'openrouter', apiKey: 'sk-test-key', fetchImpl: impl }))
      .rejects.toMatchObject({ code: 'auth' });
    await expect(fetchBalance({ provider: 'openrouter', apiKey: 'sk-test-key', fetchImpl: impl }))
      .rejects.toThrow(/Management Key/);
  });

  it('maps 429 to rate-limit', async () => {
    const { impl } = fakeFetch({ error: { message: 'slow down' } }, 429);
    await expect(fetchBalance({ provider: 'deepseek', apiKey: 'sk-test-key', fetchImpl: impl }))
      .rejects.toMatchObject({ code: 'rate-limit' });
  });

  it('maps network failures to network', async () => {
    const impl = (async () => { throw new Error('getaddrinfo ENOTFOUND'); }) as typeof fetch;
    await expect(fetchBalance({ provider: 'deepseek', apiKey: 'sk-test-key', fetchImpl: impl }))
      .rejects.toMatchObject({ code: 'network' });
  });

  it('rejects malformed 200 responses as format errors', async () => {
    const { impl } = fakeFetch({ is_available: true, balance_infos: [{ currency: 'CNY' }] });
    await expect(fetchBalance({ provider: 'deepseek', apiKey: 'sk-test-key', fetchImpl: impl }))
      .rejects.toMatchObject({ code: 'format' });
  });

  it('rejects a missing key before making a request', async () => {
    let called = false;
    const impl = (async () => { called = true; return jsonResponse({}); }) as typeof fetch;
    await expect(fetchBalance({ provider: 'deepseek', apiKey: '  ', fetchImpl: impl }))
      .rejects.toMatchObject({ code: 'missing-key' });
    expect(called).toBe(false);
  });
});

describe('formatting and redaction', () => {
  it('formats amounts with manual thousands separators', () => {
    expect(formatMoney(1234.5, 'CNY')).toBe('¥1,234.50');
    expect(formatMoney(-1234.5, 'USD')).toBe('-$1,234.50');
    expect(formatMoney(0, 'CNY')).toBe('¥0.00');
    expect(formatMoney(1.005, 'USD')).toBe('$1.01');
  });

  it('redacts the exact key and sk- tokens', () => {
    const key = 'sk-abcdef123456';
    expect(redact(`bad ${key} again ${key}`, key)).not.toContain(key);
    expect(redact('token sk-zzzzzzzz')).toBe('token sk-[redacted]');
    expect(redact('plain text')).toBe('plain text');
  });

  it('normalizes thrown values', () => {
    expect(errorText(new BalanceError('auth', 'nope'))).toEqual({ code: 'auth', message: 'nope' });
    expect(errorText(new Error('boom'))).toEqual({ code: 'unknown', message: 'boom' });
  });

  it('exposes provider metadata with distinct key slots', () => {
    expect(providerById('deepseek').envName).toBe('API_BALANCE_DEEPSEEK_API_KEY');
    expect(providerById('moonshot-global').currency).toBe('USD');
    expect(providerById('unknown').id).toBe('deepseek');
  });
});
