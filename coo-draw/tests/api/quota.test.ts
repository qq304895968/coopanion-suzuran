import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICE_CNY, fetchApiQuota, limitsFromQuotas, priceFromModels } from '../../src/api/quota.ts';
import { fakeQwen } from './helpers.ts';

describe('quota parsing', () => {
  it('reads qwen-image request limits', () => {
    const limits = limitsFromQuotas({
      output: {
        quotas: [{
          model: 'qwen-image-3.0',
          model_limit: {
            request_limit: 2,
            request_limit_period: 6,
            async_user_queue_limit: 200,
            async_user_concurrency_limit: 10,
          },
        }],
      },
    });
    expect(limits).toMatchObject({
      requestLimit: 2,
      requestPeriodSeconds: 6,
      queueLimit: 200,
      concurrencyLimit: 10,
    });
  });

  it('ignores other models and missing fields', () => {
    expect(limitsFromQuotas({ output: { quotas: [{ model: 'qwen-plus' }] } })).toEqual({});
    expect(limitsFromQuotas({ output: {} })).toEqual({});
  });

  it('reads the qwen-image 1K output price', () => {
    expect(priceFromModels({
      output: {
        models: [{
          model: 'qwen-image-3.0',
          prices: [{ prices: [{ type: 'qima_output_1k', price: '0.18' }] }],
        }],
      },
    })).toBe(0.18);
  });
});

describe('fetchApiQuota', () => {
  it('combines the quota and price endpoints', async () => {
    const fake = fakeQwen();
    const quota = await fetchApiQuota('sk-test', fake.fetchImpl);
    expect(quota).toMatchObject({
      requestLimit: 2,
      requestPeriodSeconds: 6,
      queueLimit: 200,
      concurrencyLimit: 10,
      priceCny: 0.18,
    });
    expect(quota.errors).toEqual([]);
    expect(fake.calls.map((call) => call.url)).toEqual([
      'https://maas.qianwenaiapi.com/api/v1/quotas?model=qwen-image-3.0',
      'https://maas.qianwenaiapi.com/api/v1/models?model=qwen-image-3.0',
    ]);
  });

  it('keeps the default price and reports partial failures', async () => {
    const fake = fakeQwen({ quotaStatus: 500, modelsStatus: 500 });
    const quota = await fetchApiQuota('sk-test', fake.fetchImpl);
    expect(quota.priceCny).toBe(DEFAULT_PRICE_CNY);
    expect(quota.errors).toHaveLength(2);
    expect(quota.errors.join(' ')).not.toContain('sk-test');
  });
});
