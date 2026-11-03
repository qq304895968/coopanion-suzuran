/** 对话表情包面板:19 行「表情 / 概率 / 文件夹 / 选择 / 清空」+ 默认概率/冷却 + 提示词 + 当前心情。 */
import type {
  WebUiCheckbox,
  WebUiClientBundle,
  WebUiPanel,
  WebUiPanelContext,
} from 'cortico/web/shared/client-panel.ts';
import {
  DEFAULT_PROMPT_TEXT,
  EMOTIONS,
  EMOTION_LABELS,
  PROMPT_MAX_LENGTH,
  type Emotion,
  type ResolvedConfig,
} from '../config.ts';
import './style.css';

type Response = { ok: true; state: ResolvedConfig } | { ok: false; error: string };

type MoodResponse = {
  ok: true;
  mood: { emotion: string; setAt: number; remainingSeconds: number; from: string } | null;
  ttlMinutes: number;
  watch: {
    running: boolean;
    lastScanAt: number | null;
    lastScanMood: string | null;
    noMoodRun: number;
    warnedNoMood: boolean;
    warnedSilent: boolean;
    noMoodCount: number;
    silentMinutes: number;
  };
};

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
        '每个表情一个图片文件夹和一个出图概率;只收 png/jpg/jpeg/gif/webp,每张不超过 5 MB。改完立即生效,不用重启。',
        'One picture folder and one send chance per emotion. Only png/jpg/jpeg/gif/webp up to 5 MB. Changes apply at once.',
      ),
    });
    ctx.root.append(sheet.el);

    const msg = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    sheet.body.append(msg);

    let state: ResolvedConfig | null = null;
    let manual = typeof ctx.pickPath !== 'function';
    let alive = true;
    let promptToggle: WebUiCheckbox | null = null;
    ctx.own({ dispose: () => { alive = false; } });

    // 心情放在面板顶部,不用滚到底;清除按钮就在旁边。
    const moodRow = ctx.ui.rowbar();
    const moodLine = ctx.ui.msgline(t('当前心情:读取中…', 'Current mood: loading…'));
    moodRow.append(moodLine);
    const clearMoodButton = ctx.ui.button(t('清除', 'Clear'), { size: 'sm' });
    moodRow.append(clearMoodButton);
    sheet.body.append(moodRow);

    const moodStatusLine = ctx.ui.msgline('');
    sheet.body.append(moodStatusLine);

    const ago = (at: number): string => {
      const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
      if (seconds < 60) return t(`${seconds} 秒前`, `${seconds}s ago`);
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return t(`${minutes} 分钟前`, `${minutes} min ago`);
      return t(`${Math.floor(minutes / 60)} 小时前`, `${Math.floor(minutes / 60)}h ago`);
    };

    const globals = ctx.ui.rowbar();
    const defaultInput = ctx.ui.input({ type: 'number', cls: 'mono emote-pics-num' });
    defaultInput.min = '0';
    defaultInput.max = '100';
    defaultInput.step = '5';
    const cooldownInput = ctx.ui.input({ type: 'number', cls: 'mono emote-pics-num' });
    cooldownInput.min = '0';
    cooldownInput.step = '5';
    globals.append(ctx.ui.field(t('默认概率(%)', 'Default chance (%)'), defaultInput));
    globals.append(ctx.ui.field(t('冷却(秒)', 'Cooldown (s)'), cooldownInput));
    sheet.body.append(globals);

    const table = ctx.ui.table({
      head: [t('表情', 'Emotion'), t('概率(%)', 'Chance (%)'), t('文件夹', 'Folder'), '', ''],
    });
    table.el.classList.add('emote-pics');
    sheet.body.append(table.el);

    const showMood = (text: string): void => {
      moodLine.textContent = text;
    };

    const refreshMood = async (): Promise<void> => {
      try {
        const res = await ctx.invoke<MoodResponse>('mood');
        if (!alive || !res.ok) return;
        if (!res.mood) {
          showMood(t('当前心情:未设置', 'Current mood: not set'));
        } else {
          const label = EMOTION_LABELS[res.mood.emotion as Emotion];
          const name = label ? `${label.zh}（${res.mood.emotion}）` : res.mood.emotion;
          const minutes = Math.max(1, Math.ceil(res.mood.remainingSeconds / 60));
          const age = Math.max(0, Math.floor((Date.now() - res.mood.setAt) / 60_000));
          const written = age <= 0 ? t('刚刚写的', 'written just now') : t(`${age} 分钟前写的`, `written ${age} min ago`);
          showMood(t(
            `当前心情:${name},来源 ${res.mood.from},${written},还剩约 ${minutes} 分钟`,
            `Current mood: ${name}, from ${res.mood.from}, ${written}, about ${minutes} min left`,
          ));
        }

        const watch = res.watch;
        let status: string;
        if (!watch.running) {
          status = t('自动感知:未启动', 'Auto sensing: not running');
        } else {
          const when = watch.lastScanAt === null ? t('还没扫到过', 'no bubble seen yet') : ago(watch.lastScanAt);
          const read = watch.lastScanAt === null
            ? ''
            : ` · ${watch.lastScanMood
              ? t(`读到 ${watch.lastScanMood}`, `read ${watch.lastScanMood}`)
              : t('这句没带标记', 'no mood in it')}`;
          status = t(`自动感知:运行中 · ${when}`, `Auto sensing: running · ${when}`) + read;
          if (watch.warnedNoMood) {
            status += t(` · 连续 ${watch.noMoodCount} 条没读到表情`, ` · ${watch.noMoodCount} bubbles with no mood`);
          }
          if (watch.warnedSilent) {
            status += t(` · 已 ${watch.silentMinutes} 分钟没扫到事件`, ` · no bubble for ${watch.silentMinutes} min`);
          }
        }
        moodStatusLine.textContent = status;
        moodStatusLine.classList.toggle('bad', watch.warnedNoMood || watch.warnedSilent);
      } catch {
        // 读不到心情不影响面板其它部分。
      }
    };

    const say = (text: string, bad = false): void => {
      msg.textContent = text;
      msg.classList.toggle('bad', bad);
    };

    const apply = async (method: string, args: unknown[]): Promise<void> => {
      try {
        const res = await ctx.invoke<Response>(method, args);
        if (!alive) return;
        if (!res.ok) {
          say(res.error, true);
          return;
        }
        state = res.state;
        say(t('已保存,下一句就按新配置走。', 'Saved; the next call uses it.'));
        render();
      } catch (err) {
        if (alive) say(err instanceof Error ? err.message : String(err), true);
      }
    };

    const setDir = (emotion: Emotion, path: string): Promise<void> => apply('setDir', [emotion, path]);
    const setChance = (emotion: Emotion, chance: number): Promise<void> => apply('setChance', [emotion, chance]);
    const setDefaults = (patch: { defaultChance?: number; cooldownSeconds?: number }): Promise<void> =>
      apply('setDefaults', [patch]);

    clearMoodButton.addEventListener('click', () => {
      const lock = ctx.ui.disable(clearMoodButton);
      void (async () => {
        try {
          await ctx.invoke('clearMood');
          if (alive) await refreshMood();
        } catch (err) {
          if (alive) say(err instanceof Error ? err.message : String(err), true);
        } finally {
          lock.dispose();
        }
      })();
    }, { signal: ctx.signal });

    defaultInput.addEventListener('change', () => {
      const value = Number(defaultInput.value);
      if (!Number.isFinite(value)) {
        render();
        return;
      }
      void setDefaults({ defaultChance: Math.min(100, Math.max(0, value)) / 100 });
    }, { signal: ctx.signal });

    cooldownInput.addEventListener('change', () => {
      const value = Number(cooldownInput.value);
      if (!Number.isFinite(value)) {
        render();
        return;
      }
      void setDefaults({ cooldownSeconds: Math.max(0, value) });
    }, { signal: ctx.signal });

    const choose = async (emotion: Emotion, button: HTMLButtonElement): Promise<void> => {
      const lock = ctx.ui.disable(button);
      try {
        const path = await ctx.pickPath({
          kind: 'directory',
          title: t(
            `选择「${EMOTION_LABELS[emotion].zh}」的图片文件夹`,
            `Choose the picture folder for ${emotion}`,
          ),
          ...(state?.emotions[emotion].dir ? { currentPath: state.emotions[emotion].dir } : {}),
        });
        if (path && alive) await setDir(emotion, path);
      } catch {
        manual = true;
        if (!alive) return;
        say(
          t('这台宿主机没有可用的目录选择器,改用下面的输入框手填路径。', 'No folder picker here; type the path in the box instead.'),
          true,
        );
        render();
      } finally {
        lock.dispose();
      }
    };

    function render(): void {
      if (!state) return;
      const snapshot = state;
      table.clear();
      defaultInput.value = String(percent(snapshot.defaultChance));
      cooldownInput.value = String(snapshot.cooldownSeconds);
      promptToggle?.setChecked(snapshot.prompt.enabled);

      for (const emotion of EMOTIONS) {
        const setting = snapshot.emotions[emotion];
        const name = `${EMOTION_LABELS[emotion].zh} (${emotion})`;

        const chanceInput = ctx.ui.input({
          type: 'number',
          value: String(percent(setting.chance)),
          cls: 'mono emote-pics-num',
        });
        chanceInput.min = '0';
        chanceInput.max = '100';
        chanceInput.step = '5';
        chanceInput.title = setting.chanceSet
          ? t('这个表情自己的概率', 'This emotion has its own chance')
          : t(`跟随默认概率 ${percent(snapshot.defaultChance)}%`, `Follows the default ${percent(snapshot.defaultChance)}%`);
        chanceInput.addEventListener('change', () => {
          const value = Number(chanceInput.value);
          if (!Number.isFinite(value)) {
            render();
            return;
          }
          void setChance(emotion, Math.min(100, Math.max(0, value)) / 100);
        }, { signal: ctx.signal });

        const clear = ctx.ui.button(t('清空', 'Clear'), {
          size: 'sm',
          onClick: () => void setDir(emotion, ''),
        });

        if (manual) {
          const input = ctx.ui.input({
            value: setting.dir,
            placeholder: t('绝对路径,例如 D:\\pics\\happy', 'Absolute path, e.g. D:\\pics\\happy'),
            cls: 'mono',
          });
          const saveButton = ctx.ui.button(t('保存', 'Save'), {
            size: 'sm',
            onClick: () => void setDir(emotion, input.value.trim()),
          });
          table.addRow([name, chanceInput, input, saveButton, clear]);
        } else {
          let button: HTMLButtonElement;
          button = ctx.ui.button(t('选择文件夹', 'Choose folder'), {
            size: 'sm',
            onClick: () => void choose(emotion, button),
          });
          const pathCell = setting.dir ? setting.dir : ctx.ui.placeholder(t('未配置', 'Not set'));
          table.addRow([name, chanceInput, pathCell, button, clear]);
        }
      }
    }

    /** 提示词区块:开关、正文、恢复默认、保存;正文只在「保存」时写盘。 */
    function buildPrompt(): void {
      if (!state) return;
      const stored = state.prompt;
      const promptSheet = ctx.ui.sheet({
        title: t('情绪配图提示词', 'Emotion-picture prompt'),
        desc: t(
          '这段是写给桌宠看的,会出现在它每次思考的环境说明里。',
          'This note is written for the bot; it appears in the environment description of every request.',
        ),
      });
      ctx.root.append(promptSheet.el);

      const toggle = ctx.ui.checkbox(t('注入这段提示词', 'Inject this prompt'), {
        checked: stored.enabled,
        onChange: (checked) => { void apply('setPromptEnabled', [checked]); },
      });
      promptToggle = toggle;
      promptSheet.body.append(toggle.el);

      const area = ctx.ui.textarea({ value: stored.text, rows: 9 });
      promptSheet.body.append(area);

      const counter = ctx.ui.msgline(`${area.value.length} / ${PROMPT_MAX_LENGTH}`);
      area.addEventListener('input', () => {
        counter.textContent = `${area.value.length} / ${PROMPT_MAX_LENGTH}`;
      }, { signal: ctx.signal });

      const bar = ctx.ui.rowbar();
      const promptMsg = ctx.ui.msgline('');
      promptMsg.classList.add('emote-pics-prompt-msg');
      let hideTimer: { dispose(): void } | null = null;
      const promptSay = (text: string, bad = false): void => {
        hideTimer?.dispose();
        hideTimer = null;
        promptMsg.textContent = text;
        promptMsg.classList.toggle('bad', bad);
        if (!bad) {
          hideTimer = ctx.timeout(() => { promptMsg.textContent = ''; }, 3000);
        }
      };

      bar.append(ctx.ui.button(t('恢复默认', 'Restore default'), {
        size: 'sm',
        onClick: () => {
          area.value = DEFAULT_PROMPT_TEXT;
          counter.textContent = `${area.value.length} / ${PROMPT_MAX_LENGTH}`;
          promptSay(t('已换回默认文本,点「保存」才会写盘。', 'Default text restored; press Save to write it.'));
        },
      }));
      const savePrompt = async (): Promise<void> => {
        try {
          const res = await ctx.invoke<Response>('setPromptText', [area.value]);
          if (!alive) return;
          if (!res.ok) {
            promptSay(res.error, true);
            return;
          }
          state = res.state;
          // 空文本/旧默认会被解析成新默认;把解析后的正文放回框里,免得看见的和注入的不一样。
          area.value = res.state.prompt.text;
          counter.textContent = `${area.value.length} / ${PROMPT_MAX_LENGTH}`;
          promptSay(t('已保存', 'Saved'));
        } catch (err) {
          if (alive) promptSay(err instanceof Error ? err.message : String(err), true);
        }
      };
      bar.append(ctx.ui.button(t('保存', 'Save'), {
        size: 'sm',
        onClick: () => { void savePrompt(); },
      }));
      promptSheet.body.append(bar);
      promptSheet.body.append(promptMsg);
      promptSheet.body.append(counter);
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
      buildPrompt();
      void refreshMood();
      ctx.interval(() => void refreshMood(), 15000);
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
      title: t('桌面弹图', 'Desktop popup'),
      desc: t(
        '发图时在桌面上同步弹一张。位置留空就用默认位置(右下偏上,避开桌宠气泡);改完立即生效。',
        'Show the same picture on the desktop when a picture is sent. Empty position uses the default (lower right, above the pet bubble).',
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

      const enabled = ctx.ui.checkbox(t('发图时在桌面弹一张', 'Show a popup when a picture is sent'), {
        checked: popup.enabled,
        onChange: (checked) => { void save({ enabled: checked }); },
      });
      sheet.body.append(enabled.el);

      const follow = ctx.ui.checkbox(t('弹出图片跟随桌宠上次站的位置', 'Place the popup beside the pet’s last position'), {
        checked: popup.followPet,
        onChange: (checked) => {
          applyFollow(checked);
          void save({ followPet: checked });
        },
      });
      sheet.body.append(follow.el);
      const followNote = ctx.ui.msgline(t(
        '实时从屏幕底部认出桌宠的位置（截图在本地解析，不联网、不调用模型）；多显示器时只扫描主屏。开启后下面的横向/纵向坐标不生效，图也可能被桌宠挡住。',
        'Recognizes the pet along the bottom of the screen (decoded locally; no network, no model). Only the primary screen is scanned. X/Y below are ignored, and the pet may cover the picture.',
      ));
      followNote.classList.add('emote-pics-follow-note');
      sheet.body.append(followNote);

      const coords = ctx.ui.rowbar();
      const xInput = ctx.ui.input({
        type: 'number',
        value: popup.x === null ? '' : String(popup.x),
        placeholder: '0.86',
        cls: 'mono emote-pics-num',
      });
      xInput.min = '0';
      xInput.max = '1';
      xInput.step = '0.01';
      const yInput = ctx.ui.input({
        type: 'number',
        value: popup.y === null ? '' : String(popup.y),
        placeholder: '0.74',
        cls: 'mono emote-pics-num',
      });
      yInput.min = '0';
      yInput.max = '1';
      yInput.step = '0.01';
      coords.append(ctx.ui.field(t('横向 0~1(空 = 默认)', 'X 0–1 (empty = default)'), xInput));
      coords.append(ctx.ui.field(t('纵向 0~1(空 = 默认)', 'Y 0–1 (empty = default)'), yInput));
      sheet.body.append(coords);
      xInput.addEventListener('change', () => {
        const value = xInput.value.trim();
        void save({ x: value === '' ? null : Number(value) });
      }, { signal: ctx.signal });
      yInput.addEventListener('change', () => {
        const value = yInput.value.trim();
        void save({ y: value === '' ? null : Number(value) });
      }, { signal: ctx.signal });

      const followRow = ctx.ui.rowbar();
      const sideSelect = ctx.ui.select({
        value: popup.followSide,
        options: [
          { value: 'auto', label: t('自动', 'Auto') },
          { value: 'left', label: t('左侧', 'Left') },
          { value: 'right', label: t('右侧', 'Right') },
        ],
      });
      sideSelect.addEventListener('change', () => {
        void save({ followSide: sideSelect.value });
      }, { signal: ctx.signal });
      followRow.append(ctx.ui.field(t('跟随方向', 'Follow side'), sideSelect));
      const gapInput = ctx.ui.input({
        type: 'number',
        value: String(popup.followGap),
        cls: 'mono emote-pics-num',
      });
      gapInput.min = '0';
      gapInput.max = '200';
      gapInput.step = '1';
      followRow.append(ctx.ui.field(t('水平间距(px)', 'Gap (px)'), gapInput));
      gapInput.addEventListener('change', () => {
        void save({ followGap: Number(gapInput.value) });
      }, { signal: ctx.signal });
      const offsetInput = ctx.ui.input({
        type: 'number',
        value: String(popup.followOffsetY),
        cls: 'mono emote-pics-num',
      });
      offsetInput.min = '0';
      offsetInput.max = '200';
      offsetInput.step = '1';
      followRow.append(ctx.ui.field(t('底部偏移(px)', 'Bottom offset (px)'), offsetInput));
      offsetInput.addEventListener('change', () => {
        void save({ followOffsetY: Number(offsetInput.value) });
      }, { signal: ctx.signal });
      sheet.body.append(followRow);
      const applyFollow = (on: boolean): void => {
        xInput.disabled = on;
        yInput.disabled = on;
        xInput.title = on ? t('跟随时不使用固定横向坐标', 'X is ignored while following') : '';
        yInput.title = on ? t('跟随时不使用固定纵向坐标', 'Y is ignored while following') : '';
      };
      applyFollow(popup.followPet);

      const durationRow = ctx.ui.rowbar();
      const durationInput = ctx.ui.input({
        type: 'number',
        value: String(popup.duration),
        cls: 'mono emote-pics-num',
      });
      durationInput.min = '0.5';
      durationInput.max = '60';
      durationInput.step = '0.5';
      durationRow.append(ctx.ui.field(t('停留(秒)', 'Duration (s)'), durationInput));
      sheet.body.append(durationRow);
      durationInput.addEventListener('change', () => {
        void save({ duration: Number(durationInput.value) });
      }, { signal: ctx.signal });

      const scaleInput = ctx.ui.input({
        type: 'number',
        value: String(popup.scale),
        cls: 'mono emote-pics-num',
      });
      scaleInput.min = '0.1';
      scaleInput.max = '3';
      scaleInput.step = '0.1';
      durationRow.append(ctx.ui.field(t('缩放', 'Scale'), scaleInput));
      scaleInput.addEventListener('change', () => {
        void save({ scale: Number(scaleInput.value) });
      }, { signal: ctx.signal });

      const radiusInput = ctx.ui.input({
        type: 'number',
        value: String(popup.radius),
        cls: 'mono emote-pics-num',
      });
      radiusInput.min = '0';
      radiusInput.max = '64';
      radiusInput.step = '1';
      durationRow.append(ctx.ui.field(t('圆角(px)', 'Corner radius (px)'), radiusInput));
      radiusInput.addEventListener('change', () => {
        void save({ radius: Number(radiusInput.value) });
      }, { signal: ctx.signal });

      const queueToggle = ctx.ui.checkbox(t('连发时排队,不顶掉前一张', 'Queue when several are sent'), {
        checked: popup.queue,
        onChange: (checked) => { void save({ queue: checked }); },
      });
      sheet.body.append(queueToggle.el);

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
      const refreshHealth = async (): Promise<void> => {
        try {
          const health = await ctx.invoke<{
            ok: boolean;
            status: string;
            lastError: string | null;
          }>('popupHealth');
          if (!alive || !health.ok) return;
          healthMsg.textContent = t(`弹图状态:${health.status}`, `Popup: ${health.status}`);
          healthMsg.classList.toggle('bad', health.status.startsWith('error'));
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
