/**
 * 「日记」页的目录面板：显示当前目录与今天状态，
 * 提供「打开当前文件夹」「复制路径」「刷新」。
 */
import type { WebUiClientBundle, WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';

interface FolderInfo {
  path: string;
  assigned: boolean;
  exists: boolean;
  today: string;
  todayFile: boolean;
  error?: string;
}

const folderPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    const doc = ctx.root.ownerDocument;

    const sheet = ctx.ui.sheet({
      title: t('日记目录', 'Diary folder'),
      desc: t(
        '当前日记目录和今天的文件；可以直接在资源管理器里打开。',
        'The current diary folder; open it in your file manager.',
      ),
    });
    ctx.root.append(sheet.el);

    const pathLine = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    const statusLine = ctx.ui.msgline('');
    const row = ctx.ui.rowbar();

    let info: FolderInfo | null = null;

    // 原生链接 + 隐藏 iframe：点击由浏览器直接发 GET，不依赖客户端 fetch。
    const frameName = 'diary-open-frame';
    const frame = doc.createElement('iframe');
    frame.name = frameName;
    frame.style.display = 'none';
    frame.setAttribute('aria-hidden', 'true');
    sheet.body.append(frame);

    const openLink = doc.createElement('a');
    openLink.className = 'btn primary';
    openLink.textContent = t('打开当前文件夹', 'Open folder');
    openLink.href = '/api/webui/providers/world:diary/panels/folder/open';
    openLink.target = frameName;
    openLink.rel = 'noopener';
    openLink.addEventListener('click', (event) => {
      if (!info || !info.assigned || info.error) {
        event.preventDefault();
        statusLine.classList.add('bad');
        statusLine.textContent = info?.error
          ?? t('还没设置日记目录。请先到配置里填一个绝对路径。', 'Set the diary folder in the config first.');
        return;
      }
      statusLine.classList.remove('bad');
      statusLine.textContent = t(
        '已请求打开；如果没出现窗口，点“复制路径”到资源管理器里打开。',
        'Opening… if nothing appears, use “Copy path”.',
      );
    });

    const copyButton = ctx.ui.copyButton(() => info?.path ?? '', {
      label: t('复制路径', 'Copy path'),
      size: 'sm',
      okText: t('路径已复制', 'Path copied'),
    });
    const refreshButton = ctx.ui.button(t('刷新', 'Refresh'), {
      size: 'sm',
      onClick: () => { void load(); },
    });

    row.append(openLink, copyButton, refreshButton);
    sheet.body.append(pathLine, statusLine, row);

    const setError = (text: string): void => {
      pathLine.textContent = text;
      pathLine.classList.add('bad');
    };

    const load = async (): Promise<void> => {
      try {
        info = await ctx.invoke<FolderInfo>('info');
        pathLine.classList.remove('bad');

        if (info.error) {
          setError(info.error);
          return;
        }
        if (!info.assigned) {
          pathLine.textContent = t('还没设置日记目录。', 'The diary folder is not set.');
          statusLine.textContent = t('先到上面的配置填一个绝对路径。', 'Set an absolute path in the config above.');
          return;
        }
        pathLine.textContent = t(`当前：${info.path}`, `Current: ${info.path}`);
        statusLine.textContent = t(
          `${info.exists ? '目录存在' : '目录不存在（打开时会创建）'} · ${info.todayFile ? '今天已经写过' : '今天还没写'}`,
          `${info.exists ? 'Folder exists' : 'Folder will be created on open'} · ${info.todayFile ? 'written today' : 'not written today'}`,
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    await load();
  },
};

export default { panels: { folder: folderPanel } } satisfies WebUiClientBundle;
