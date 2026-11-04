import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { API_BALANCE_DEFAULTS, type ApiBalanceConfigSection } from './config.ts';
import { API_BALANCE_TOOL_DECLS, ApiBalanceWorld } from './world.ts';

/** One-line descriptions for people, separate from the model-facing tool text. */
const TOOL_SUMMARIES = {
  api_balance: {
    zh: '查当前 API 平台的账户余额；金额和币种照实回答，查不到就说查不到。',
    en: 'Check the current API account balance; report the exact amount and currency, never invent one.',
  },
  api_balance_settings: {
    zh: '按对方明确要求切换查询平台、缓存秒数或超时；API Key 只能在本插件页面填写。',
    en: 'Switch provider, cache seconds or timeout when explicitly asked; the API key is only entered on the plugin page.',
  },
} as const;

export const API_BALANCE: WorldDefinition<ApiBalanceConfigSection> = {
  id: 'api-balance',
  label: 'API 余额',
  defaults: () => ({ ...API_BALANCE_DEFAULTS }),
  create: (ctx) => new ApiBalanceWorld({
    cfg: ctx.cfg,
    secret: ctx.secret,
    persist: (patch) => ctx.persist(patch),
    storeSecret: (name, value) => ctx.storeSecret(name, value),
  }),
  describe: {
    tools: describeTools(API_BALANCE_TOOL_DECLS, TOOL_SUMMARIES),
    events: [],
  },
};
