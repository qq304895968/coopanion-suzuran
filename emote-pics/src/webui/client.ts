/** 对话表情包面板:一个父文件夹 + 概率/冷却 + 自动弹;弹图页只有开关、停留、尺寸、圆角、测试。 */
import type {
  WebUiClientBundle,
  WebUiPanel,
  WebUiPanelContext,
} from 'cortico/web/shared/client-panel.ts';
import type { Emotion, ResolvedConfig } from '../config.ts';
import './style.css';

type Response = { ok: true; state: ResolvedConfig } | { ok: false; error: string };
type ScanRow = { emotion: Emotion; zh: string; folder: string; count: number };
type Scan = { ok: true; dir: string; rows: ScanRow[] };

function percent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100)));
}

const foldersPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);

    const sheet = ctx.ui.sheet({
      title: t('对话表情包', 'Emote pictures'),
      desc: t(
        '选一个父文件夹,里面按情绪建子文件夹(happy / sad / … 或中文名),桌宠冒气泡时按概率挑一张弹在它身上。只收 png/jpg/jpeg/gif/webp,单张不超过 5 MB。',
        'Pick one parent folder with one sub-folder per emotion (happy / sad / … or the Chinese name). When the pet says a line, a picture pops on it by chance. png/jpg/jpeg/gif/webp up to 5 MB.',
      ),
    });
    ctx.root.append(sheet.el);

    const msg = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    sheet.body.append(msg);

    let state: ResolvedConfig | null = null;
    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });

    const say = (text: string, bad = false): void => {
      msg.textContent = text;
      msg.classList.toggle('bad', bad);
    };

    const apply = async (method: string, args: unknown[], after?: string): Promise<void> => {
      try {
        const res = await ctx.invoke<Response>(method, args);
        if (!alive) return;
        if (!res.ok) {
          say(res.error, true);
          return;
        }
        state = res.state;
        say(after ?? t('已保存。', 'Saved.'));
        render();
        void refreshScan();
      } catch (err) {
        if (alive) say(err instanceof Error ? err.message : String(err), true);
      }
    };

    // ---- 父文件夹 ----
    const dirRow = ctx.ui.rowbar();
    const dirInput = ctx.ui.input({
      value: '',
      placeholder: t('绝对路径,例如 F:\\虚拟桌宠\\铃兰\\表情包', 'Absolute path, e.g. F:\\pics\\emotes'),
      cls: 'mono',
    });
    dirInput.style.flex = '1';
    dirInput.style.minWidth = '220px';
    const choose = ctx.ui.button(t('选择文件夹', 'Choose folder'), { size: 'sm' });
    const saveDir = ctx.ui.button(t('保存', 'Save'), { size: 'sm' });
    dirRow.append(dirInput, choose, saveDir);
    sheet.body.append(dirRow);
    sheet.body.append(ctx.ui.msgline(t(
      '子文件夹名就是情绪键;同一情绪优先用英文名,没有再找中文名。',
      'A sub-folder is named after the emotion key; the English name wins, then the Chinese one.',
    )));

    choose.addEventListener('click', () => {
      if (typeof ctx.pickPath !== 'function') {
        say(t('这台宿主机没有目录选择器,直接在左边填路径。', 'No folder picker here; type the path.'), true);
        return;
      }
      const lock = ctx.ui.disable(choose);
      void (async () => {
        try {
          const path = await ctx.pickPath({
            kind: 'directory',
            title: t('选择表情包的父文件夹', 'Choose the parent folder'),
            ...(state?.dir ? { currentPath: state.dir } : {}),
          });
          if (path && alive) {
            dirInput.value = path;
            await apply('setDir', [path]);
          }
        } catch {
          if (alive) say(t('目录选择器不可用,直接填路径。', 'The picker is unavailable; type the path.'), true);
        } finally {
          lock.dispose();
        }
      })();
    }, { signal: ctx.signal });

    const commitDir = (): void => {
      void apply('setDir', [dirInput.value.trim()]);
    };
    saveDir.addEventListener('click', commitDir, { signal: ctx.signal });
    dirInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') commitDir();
    }, { signal: ctx.signal });

    // ---- 概率 / 冷却 / 自动弹 ----
    const freq = ctx.ui.rowbar();
    const chanceInput = ctx.ui.input({ type: 'number', cls: 'mono emote-pics-num' });
    chanceInput.min = '0';
    chanceInput.max = '100';
    chanceInput.step = '5';
    const cooldownInput = ctx.ui.input({ type: 'number', cls: 'mono emote-pics-num' });
    cooldownInput.min = '0';
    cooldownInput.step = '5';
    freq.append(ctx.ui.field(t('出图概率(%)', 'Chance (%)'), chanceInput));
    freq.append(ctx.ui.field(t('冷却(秒)', 'Cooldown (s)'), cooldownInput));
    sheet.body.append(freq);

    chanceInput.addEventListener('change', () => {
      const value = Number(chanceInput.value);
      if (!Number.isFinite(value)) {
        render();
        return;
      }
      void apply('setChance', [Math.min(100, Math.max(0, value)) / 100]);
    }, { signal: ctx.signal });

    cooldownInput.addEventListener('change', () => {
      const value = Number(cooldownInput.value);
      if (!Number.isFinite(value)) {
        render();
        return;
      }
      void apply('setCooldown', [Math.max(0, value)]);
    }, { signal: ctx.signal });

    const autoToggle = ctx.ui.checkbox(t('扫到气泡标记就自己弹(不需要模型调用)', 'Pop on bubble markers without the model'), {
      checked: true,
      onChange: (checked) => { void apply('setAutoPopup', [checked]); },
    });
    sheet.body.append(autoToggle.el);

    // ---- 检测到的子文件夹 ----
    const table = ctx.ui.table({ head: [t('情绪', 'Emotion'), t('子文件夹', 'Folder'), t('张数', 'Pictures')] });
    table.el.classList.add('emote-pics');
    sheet.body.append(table.el);
    const scanLine = ctx.ui.msgline('');
    sheet.body.append(scanLine);

    async function refreshScan(): Promise<void> {
      try {
        const out = await ctx.invoke<Scan>('scan');
        if (!alive || !out.ok) return;
        table.clear();
        let missing = 0;
        let total = 0;
        for (const row of out.rows) {
          if (!row.folder) {
            missing++;
            continue;
          }
          total += row.count;
          table.addRow([
            `${row.zh} (${row.emotion})`,
            row.folder,
            String(row.count),
          ]);
        }
        scanLine.textContent = out.dir
          ? t(
            `共 ${out.rows.length - missing} 个情绪有文件夹、${total} 张图${missing ? `;还缺 ${missing} 个情绪` : ''}。`,
            `${out.rows.length - missing} emotions have a folder, ${total} pictures${missing ? `; ${missing} missing` : ''}.`,
          )
          : t('还没有设置父文件夹。', 'No parent folder set yet.');
      } catch {
        // 读不到不影响其它部分。
      }
    }

    function render(): void {
      if (!state) return;
      dirInput.value = state.dir;
      chanceInput.value = String(percent(state.chance));
      cooldownInput.value = String(state.cooldownSeconds);
      autoToggle.setChecked(state.autoPopup);
    }

    try {
      const res = await ctx.invoke<Response>('state');
      if (!alive) return;
      if (!res.ok) {
        say(res.error, true);
        return;
      }
      state = res.state;
      say('');
      render();
      void refreshScan();
    } catch (err) {
      if (alive) say(err instanceof Error ? err.message : String(err), true);
    }
  },
};

const popupPanel: WebUiPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);

    const sheet = ctx.ui.sheet({
      title: t('弹图', 'Popup'),
      desc: t(
        '图弹在桌宠身上,跟着角色一起走;桌宠没开时退回桌面独立窗口。',
        'Pictures pop on the pet and move with it; when the pet window is closed they fall back to a desktop popup.',
      ),
    });
    ctx.root.append(sheet.el);

    const msg = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    sheet.body.append(msg);

    let alive = true;
    ctx.own({ dispose: () => { alive = false; } });
    const say = (text: string, bad = false): void => {
      msg.textContent = text;
      msg.classList.toggle('bad', bad);
    };

    const save = async (patch: Record<string, unknown>): Promise<void> => {
      try {
        const res = await ctx.invoke<Response>('setPopup', [patch]);
        if (!alive) return;
        if (!res.ok) {
          say(res.error, true);
          return;
        }
        say(t('已保存', 'Saved'));
      } catch (err) {
        if (alive) say(err instanceof Error ? err.message : String(err), true);
      }
    };

    try {
      const res = await ctx.invoke<Response>('state');
      if (!alive) return;
      if (!res.ok) {
        say(res.error, true);
        return;
      }
      const popup = res.state.popup;
      say('');

      const enabled = ctx.ui.checkbox(t('出图时弹在桌宠身上', 'Show the picture on the pet'), {
        checked: popup.enabled,
        onChange: (checked) => { void save({ enabled: checked }); },
      });
      sheet.body.append(enabled.el);

      const follow = ctx.ui.checkbox(t(
        '桌宠身上走不通时,把窗口摆到角色脚边(跟随)',
        'When the pet itself cannot show it, put the window at the pet’s feet (follow)',
      ), {
        checked: popup.follow,
        onChange: (checked) => { void save({ follow: checked }); },
      });
      sheet.body.append(follow.el);

      const row = ctx.ui.rowbar();
      const durationInput = ctx.ui.input({
        type: 'number',
        value: String(popup.duration),
        cls: 'mono emote-pics-num',
      });
      durationInput.min = '0.5';
      durationInput.max = '60';
      durationInput.step = '0.5';
      row.append(ctx.ui.field(t('停留(秒)', 'Duration (s)'), durationInput));

      const sizeInput = ctx.ui.input({
        type: 'number',
        value: popup.size > 0 ? String(popup.size) : '',
        placeholder: t('自动', 'Auto'),
        cls: 'mono emote-pics-num',
      });
      sizeInput.min = '0';
      sizeInput.max = '2000';
      sizeInput.step = '10';
      row.append(ctx.ui.field(t('图片长边(px，0 = 自动)', 'Long edge (px, 0 = auto)'), sizeInput));

      const radiusInput = ctx.ui.input({
        type: 'number',
        value: String(popup.radius),
        cls: 'mono emote-pics-num',
      });
      radiusInput.min = '0';
      radiusInput.max = '64';
      radiusInput.step = '1';
      row.append(ctx.ui.field(t('圆角(px)', 'Radius (px)'), radiusInput));
      sheet.body.append(row);

      durationInput.addEventListener('change', () => {
        void save({ duration: Number(durationInput.value) });
      }, { signal: ctx.signal });

      sizeInput.addEventListener('change', () => {
        const raw = sizeInput.value.trim();
        void save({ size: raw === '' ? 0 : Math.round(Number(raw)) });
      }, { signal: ctx.signal });

      radiusInput.addEventListener('change', () => {
        void save({ radius: Number(radiusInput.value) });
      }, { signal: ctx.signal });

      const testRow = ctx.ui.rowbar();
      const testMsg = ctx.ui.msgline('');
      const testButton = ctx.ui.button(t('立即弹一张测试图', 'Show one test picture now'), { size: 'sm' });
      testButton.addEventListener('click', () => {
        const lock = ctx.ui.disable(testButton);
        void (async () => {
          try {
            const out = await ctx.invoke<{ ok: boolean; path?: string; error?: string }>('testPopup');
            if (!alive) return;
            if (!out.ok) {
              testMsg.textContent = out.error ?? t('弹图失败', 'Popup failed');
              testMsg.classList.add('bad');
              return;
            }
            const name = (out.path ?? '').split(/[\\/]/).pop() ?? '';
            testMsg.textContent = t(`已弹出:${name}`, `Shown: ${name}`);
            testMsg.classList.remove('bad');
          } catch (err) {
            if (alive) {
              testMsg.textContent = err instanceof Error ? err.message : String(err);
              testMsg.classList.add('bad');
            }
          } finally {
            lock.dispose();
          }
        })();
      }, { signal: ctx.signal });
      testRow.append(testButton);
      sheet.body.append(testRow);
      sheet.body.append(testMsg);

      const healthMsg = ctx.ui.msgline(t('弹图状态:…', 'Popup: …'));
      sheet.body.append(healthMsg);
      const logMsg = ctx.ui.msgline('');
      sheet.body.append(logMsg);
      const refreshHealth = async (): Promise<void> => {
        try {
          const health = await ctx.invoke<{
            ok: boolean;
            status: string;
            lastError: string | null;
            logPath: string | null;
          }>('popupHealth');
          if (!alive || !health.ok) return;
          healthMsg.textContent = t(`弹图状态:${health.status}`, `Popup: ${health.status}`);
          healthMsg.classList.toggle('bad', health.status.startsWith('error'));
          if (health.logPath) logMsg.textContent = t(`日志:${health.logPath}`, `Log: ${health.logPath}`);
        } catch {
          // 状态读不到就保持原样。
        }
      };
      void refreshHealth();
      ctx.interval(() => void refreshHealth(), 3000);
    } catch (err) {
      if (alive) say(err instanceof Error ? err.message : String(err), true);
    }
  },
};

const bundle: WebUiClientBundle = { panels: { folders: foldersPanel, popup: popupPanel } };
export default bundle;
