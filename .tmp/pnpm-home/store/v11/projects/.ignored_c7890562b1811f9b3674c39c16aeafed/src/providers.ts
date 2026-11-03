/**
 * The concrete API platforms this World knows how to ask for a balance.
 *
 * Each platform owns one endpoint and one key slot. The key slot is a name in
 * the deployment `.env`, so the value never goes into `config.json`, a tool
 * result, a log line, or the model context.
 *
 * CN and Global sites are separate providers on purpose: their keys are not
 * interchangeable, and Kimi/SiliconFlow report the CN site in CNY and the
 * Global site in USD.
 */

export interface ProviderMeta {
  readonly id: string;
  /** Chinese display name. */
  readonly label: string;
  /** English display name. */
  readonly labelEn: string;
  /** Which response shape the endpoint returns. */
  readonly api: 'deepseek' | 'moonshot' | 'siliconflow' | 'openrouter';
  /** Fixed balance endpoint. */
  readonly url: string;
  /** Key slot in the deployment `.env`, written by the panel. */
  readonly envName: string;
  /** Conventional provider key used when this World has no saved key. */
  readonly fallbackEnv?: string;
  /** Currency used when the response itself does not carry one. */
  readonly currency: 'CNY' | 'USD';
  /** Where the person can top up or manage the key. */
  readonly consoleUrl: string;
  /** Optional caveat shown in the panel. */
  readonly note?: string;
  readonly noteEn?: string;
}

export const PROVIDERS = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    labelEn: 'DeepSeek',
    api: 'deepseek',
    url: 'https://api.deepseek.com/user/balance',
    envName: 'API_BALANCE_DEEPSEEK_API_KEY',
    fallbackEnv: 'DEEPSEEK_API_KEY',
    currency: 'CNY',
    consoleUrl: 'https://platform.deepseek.com/top_up',
  },
  {
    id: 'moonshot',
    label: 'Kimi 国内站',
    labelEn: 'Kimi (China)',
    api: 'moonshot',
    url: 'https://api.moonshot.cn/v1/users/me/balance',
    envName: 'API_BALANCE_MOONSHOT_API_KEY',
    fallbackEnv: 'MOONSHOT_API_KEY',
    currency: 'CNY',
    consoleUrl: 'https://platform.kimi.com/console/account',
  },
  {
    id: 'moonshot-global',
    label: 'Kimi 国际站',
    labelEn: 'Kimi (Global)',
    api: 'moonshot',
    url: 'https://api.moonshot.ai/v1/users/me/balance',
    envName: 'API_BALANCE_MOONSHOT_GLOBAL_API_KEY',
    fallbackEnv: 'MOONSHOT_API_KEY',
    currency: 'USD',
    consoleUrl: 'https://platform.kimi.ai/console/account',
    note: '国际站的 Key 与国内站不通用；如果沿用 MOONSHOT_API_KEY 报 401，请在这里单独保存国际站的 Key。',
    noteEn: 'Global and China keys are separate. If the MOONSHOT_API_KEY fallback returns 401, save the Global key here.',
  },
  {
    id: 'siliconflow',
    label: '硅基流动',
    labelEn: 'SiliconFlow (China)',
    api: 'siliconflow',
    url: 'https://api.siliconflow.cn/v1/user/info',
    envName: 'API_BALANCE_SILICONFLOW_API_KEY',
    fallbackEnv: 'SILICONFLOW_API_KEY',
    currency: 'CNY',
    consoleUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  {
    id: 'siliconflow-global',
    label: '硅基流动国际站',
    labelEn: 'SiliconFlow (Global)',
    api: 'siliconflow',
    url: 'https://api.siliconflow.com/v1/user/info',
    envName: 'API_BALANCE_SILICONFLOW_GLOBAL_API_KEY',
    fallbackEnv: 'SILICONFLOW_API_KEY',
    currency: 'USD',
    consoleUrl: 'https://cloud.siliconflow.com/account/ak',
    note: '国际站的 Key 与国内站不通用；如果沿用 SILICONFLOW_API_KEY 报 401，请在这里单独保存国际站的 Key。',
    noteEn: 'Global and China keys are separate. If the SILICONFLOW_API_KEY fallback returns 401, save the Global key here.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    labelEn: 'OpenRouter',
    api: 'openrouter',
    url: 'https://openrouter.ai/api/v1/credits',
    envName: 'API_BALANCE_OPENROUTER_API_KEY',
    fallbackEnv: 'OPENROUTER_API_KEY',
    currency: 'USD',
    consoleUrl: 'https://openrouter.ai/settings/keys',
    note: '余额接口只认 Management Key；普通推理 Key 会返回 403。',
    noteEn: 'The credits endpoint requires a Management key; a normal inference key gets 403.',
  },
] as const satisfies readonly ProviderMeta[];

export type ProviderId = (typeof PROVIDERS)[number]['id'];

/** A provider looked up by id; the id is narrowed to the known union. */
export type ResolvedProvider = ProviderMeta & { readonly id: ProviderId };

/** The same list widened to the common shape, for reading optional fields. */
export const PROVIDER_META: readonly ProviderMeta[] = PROVIDERS;

/** All ids in declaration order, for JSON Schema enums. */
export const PROVIDER_IDS = PROVIDERS.map((provider) => provider.id) as ProviderId[];

const BY_ID = new Map<string, ProviderMeta>(PROVIDERS.map((provider) => [provider.id, provider]));

/** Unknown ids (an old config, or a model typo) fall back to DeepSeek. */
export function providerById(id: string | undefined | null): ResolvedProvider {
  return ((id ? BY_ID.get(id) : undefined) ?? BY_ID.get('deepseek')!) as ResolvedProvider;
}

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && BY_ID.has(value);
}

/** The default key slot name, used in messages when the person has not saved one. */
export function keySlotName(provider: ProviderMeta): string {
  return provider.envName;
}
