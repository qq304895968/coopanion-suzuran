/**
 * 「API 余额」页：选择平台、保存 API Key、查询余额。
 *
 * The key input is a password field and is sent once to `saveKey`; the server
 * writes it to the deployment .env and only returns a masked hint. The panel
 * never keeps the key in memo/storage and never renders it again.
 */
import type { WebUiClientBundle, WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';

interface ProviderOption {
  id: string;
  label: string;
  labelEn: string;
  currency: string;
  note: string;
  noteEn: string;
}

interface StatusPayload {
  provider: string;
  providerLabel: string;
  currency: string;
  consoleUrl: string;
  note: string;
  providers: ProviderOption[];
  key: {
    configured: boolean;
    source: 'plugin' | 'fallback' | 'none';
    envName: string;
    hint: string;
  };
  cacheSeconds: number;
  timeoutSeconds: number;
  last: {
    at: string;
    available: boolean;
    primary: string;
    lines: Array<{ label: string; amount: number; currency: string }>;
  } | null;
  lastError: { at: string; code: string; message: string } | null;
}

interface BalanceLine {
  key: string;
  label: string;
  amount: number;
  currency: string;
}

interface QueryResult {
  ok: boolean;
  error?: { code: string; message: string };
  text?: string;
  report?: { lines: BalanceLine[]; available: boolean };
  status: StatusPayload;
}

interface SaveResult {
  ok: boolean;
  error?: { code: string; message: string };
  status: StatusPayload;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function money(amount: number, currency: string): string {
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  const fixed = amount.toFixed(2);
  const [whole, fraction] = fixed.split('.');
  const negative = whole!.startsWith('-');
  const digits = negative ? whole!.slice(1) : whole!;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${symbol}${grouped}.${fraction}`;
}

function primaryOf(result: QueryResult): string {
  const lines = result.report?.lines ?? [];
  const line = lines.find((item) => item.key === 'total' || item.key === 'available' || item.key === 'remaining')
    ?? lines[0];
  return line ? money(line.amount, line.currency) : '—';
}

const balancePanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    const doc = ctx.root.ownerDocument;

    let status: StatusPayload;
    try {
      status = await ctx.invoke<StatusPayload>('status');
    } catch (error) {
      ctx.root.append(ctx.ui.msgline(message(error), true));
      return;
    }

    const sheet = ctx.ui.sheet({
      title: t('API 余额', 'API balance'),
      desc: t(
        'API Key 只保存在这台部署的 .env 里；保存后可以随时查询余额，Key 不会出现在对话或日志中。',
        'The API key is saved only in this deployment’s .env. After saving it you can check the balance any time; the key never appears in chat or logs.',
      ),
    });
    ctx.root.append(sheet.el);

    const select = ctx.ui.select({
      options: status.providers.map((provider) => ({
        value: provider.id,
        label: zh ? provider.label : provider.labelEn,
      })),
      value: status.provider,
      onChange: (value) => { void switchProvider(value); },
    });

    const input = ctx.ui.input({
      type: 'password',
      placeholder: t('粘贴 API Key', 'Paste the API key'),
      cls: 'mono',
    });

    const saveButton = ctx.ui.button(t('保存 Key', 'Save key'), {
      variant: 'primary',
      onClick: () => { void saveKey(); },
    });
    const queryButton = ctx.ui.button(t('查询余额', 'Check balance'), {
      onClick: () => { void runQuery(true); },
    });

    const consoleLink = doc.createElement('a');
    consoleLink.className = 'btn';
    consoleLink.target = '_blank';
    consoleLink.rel = 'noopener noreferrer';
    consoleLink.textContent = t('充值 / 管理 Key', 'Top up / manage key');

    const keyLine = ctx.ui.msgline('');
    const noteLine = ctx.ui.msgline('');
    const resultLine = ctx.ui.msgline('');
    const detailLine = ctx.ui.msgline('');
    const statusLine = ctx.ui.msgline('');

    const row = ctx.ui.rowbar();
    row.append(saveButton, queryButton, consoleLink);
    sheet.body.append(
      ctx.ui.field(t('平台', 'Provider'), select),
      ctx.ui.field(t('API Key', 'API key'), input),
      row,
      keyLine,
      noteLine,
      resultLine,
      detailLine,
      statusLine,
    );

    const clearResult = (): void => {
      resultLine.textContent = '';
      resultLine.classList.remove('bad');
      detailLine.textContent = '';
    };

    const clearError = (): void => {
      statusLine.textContent = '';
      statusLine.classList.remove('bad');
    };

    const showError = (text: string): void => {
      statusLine.textContent = text;
      statusLine.classList.add('bad');
    };

    const renderHeader = (next: StatusPayload): void => {
      status = next;
      const key = next.key;
      keyLine.classList.remove('bad');
      keyLine.textContent = key.configured
        ? key.source === 'plugin'
          ? t(`Key：已保存（${key.hint}），保存在 ${key.envName}。`, `Key: saved (${key.hint}) in ${key.envName}.`)
          : t(`Key：沿用环境变量 ${key.envName}（${key.hint}）。`, `Key: using ${key.envName} (${key.hint}).`)
        : t(`Key：未配置。保存后即可查询（${key.envName}）。`, `Key: not configured. Save one to query (${key.envName}).`);
      input.placeholder = key.configured
        ? t('已保存，留空不修改', 'Saved; leave empty to keep it')
        : t('粘贴 API Key', 'Paste the API key');
      queryButton.disabled = !key.configured;

      consoleLink.href = next.consoleUrl;
      consoleLink.textContent = t('充值 / 管理 Key', 'Top up / manage key');

      const note = zh
        ? next.note || next.providers.find((provider) => provider.id === next.provider)?.note || ''
        : next.providers.find((provider) => provider.id === next.provider)?.noteEn
          || next.note
          || next.providers.find((provider) => provider.id === next.provider)?.note
          || '';
      noteLine.textContent = note;
      noteLine.style.display = note ? '' : 'none';
    };

    const renderLast = (next: StatusPayload): void => {
      if (next.last) {
        resultLine.classList.remove('bad');
        resultLine.textContent = t(`上次余额：${next.last.primary}`, `Last balance: ${next.last.primary}`);
        detailLine.textContent = next.last.lines
          .map((line) => `${line.label} ${money(line.amount, line.currency)}`)
          .join(' · ');
      } else if (next.lastError) {
        resultLine.classList.add('bad');
        resultLine.textContent = `[${next.lastError.code}] ${next.lastError.message}`;
        detailLine.textContent = '';
      } else {
        clearResult();
      }
    };

    const renderStatus = (next: StatusPayload): void => {
      renderHeader(next);
      renderLast(next);
    };

    const runQuery = async (refresh: boolean): Promise<void> => {
      clearError();
      const busy = ctx.ui.busy(t('正在查询…', 'Checking…'));
      try {
        const result = await ctx.invoke<QueryResult>('query', [select.value, refresh]);
        if (!result.ok) {
          resultLine.classList.add('bad');
          resultLine.textContent = `[${result.error?.code ?? 'unknown'}] ${result.error?.message ?? t('查询失败', 'Query failed')}`;
          detailLine.textContent = '';
          renderHeader(result.status);
          return;
        }
        renderHeader(result.status);
        resultLine.classList.remove('bad');
        resultLine.textContent = t(`余额：${primaryOf(result)}`, `Balance: ${primaryOf(result)}`);
        detailLine.textContent = (result.report?.lines ?? [])
          .map((line) => `${line.label} ${money(line.amount, line.currency)}`)
          .join(' · ');
        if (result.report && !result.report.available) {
          resultLine.textContent += t('（余额不足）', ' (insufficient)');
        }
        ctx.ui.toast(t('已更新', 'Updated'));
      } catch (error) {
        showError(message(error));
      } finally {
        busy.dispose();
      }
    };

    const saveKey = async (): Promise<void> => {
      clearError();
      const key = input.value.trim();
      if (!key) {
        showError(t('先粘贴 API Key。', 'Paste an API key first.'));
        return;
      }
      const busy = ctx.ui.busy(t('正在保存…', 'Saving…'));
      try {
        const result = await ctx.invoke<SaveResult>('saveKey', [select.value, key]);
        if (!result.ok) {
          renderHeader(result.status);
          showError(result.error?.message ?? t('保存失败', 'Save failed'));
          return;
        }
        input.value = '';
        renderHeader(result.status);
        ctx.ui.toast(t('Key 已保存', 'Key saved'));
        void runQuery(true);
      } catch (error) {
        showError(message(error));
      } finally {
        busy.dispose();
      }
    };

    const switchProvider = async (value: string): Promise<void> => {
      const previous = status.provider;
      clearError();
      try {
        const result = await ctx.setConfig('world:api-balance', { 'worlds.api-balance.provider': value });
        const next = await ctx.invoke<StatusPayload>('status', [value]);
        clearResult();
        renderHeader(next);
        if (next.key.configured) void runQuery(false);
        else renderLast(next);
        if (result) ctx.ui.toast(result);
      } catch (error) {
        select.value = previous;
        showError(message(error));
      }
    };

    renderStatus(status);
    if (status.key.configured) void runQuery(false);
  },
};

export default { panels: { balance: balancePanel } } satisfies WebUiClientBundle;
