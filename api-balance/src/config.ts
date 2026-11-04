import type { ConfigGroup } from 'cortico/core/types.ts';
import { PROVIDER_IDS, type ProviderId } from './providers.ts';

/** `worlds.api-balance` section. */
export interface ApiBalanceConfigSection {
  enabled: boolean;
  /** Which platform the balance tool queries by default. */
  provider: ProviderId;
  /** Reuse a result for this many seconds; 0 = always ask. */
  cacheSeconds: number;
  /** Abort a request after this many seconds. */
  timeoutSeconds: number;
}

export const API_BALANCE_DEFAULTS: ApiBalanceConfigSection = {
  enabled: false,
  provider: 'deepseek',
  cacheSeconds: 60,
  timeoutSeconds: 10,
};

export const API_BALANCE_CONFIG_GROUP: ConfigGroup = {
  id: 'world:api-balance',
  owner: 'world:api-balance',
  schema: {
    type: 'object',
    title: 'API 余额',
    description:
      '查询 DeepSeek、Kimi、硅基流动、OpenRouter 的账户余额。API Key 在「API 余额」页填写，保存到部署密钥库（.env）；不写进 config.json、日志或对话。',
    properties: {
      'worlds.api-balance.provider': {
        type: 'string',
        title: '查询平台',
        description:
          '默认查询哪个平台。每个平台各有一把保存在部署 .env 的 Key，换平台不会丢 Key，也不会把 Key 带到别的平台。',
        enum: [...PROVIDER_IDS],
        'x-hot': true,
      },
      'worlds.api-balance.cacheSeconds': {
        type: 'integer',
        title: '结果缓存（秒）',
        description: '0–300；默认 60。缓存期内重复问余额不会重新请求平台，点「刷新」或在工具里传 refresh 可以强制查询。',
        minimum: 0,
        maximum: 300,
        'x-suffix': '秒',
        'x-hot': true,
      },
      'worlds.api-balance.timeoutSeconds': {
        type: 'integer',
        title: '请求超时（秒）',
        description: '3–30；默认 10。平台连不上时按这个时间放弃，回执会说是超时而不是余额为零。',
        minimum: 3,
        maximum: 30,
        'x-suffix': '秒',
        'x-hot': true,
      },
    },
  },
};
