/**
 * 「绘画」页的画夹面板：显示当前目录与各评价数量，提供「打开当前文件夹」和「选择文件夹」。
 * 只通过 WebUiPanelContext 与宿主交互；不碰 document.body，不自己建窗口。
 */
import type { WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';

interface FolderInfo {
  path: string;
  fallback: boolean;
  error?: string;
  total: number;
  counts: Record<string, number>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const folderPanel = {
  async mount(ctx: WebUiPanelContext): Promise<void> {
    const zh = ctx.language.startsWith('zh');
    const t = (z: string, e: string): string => (zh ? z : e);
    const doc = ctx.root.ownerDocument;

    const sheet = ctx.ui.sheet({
      title: t('画夹', 'Drawing folder'),
      desc: t('画好的图按评价存在这里；也可以从这里换目录。', 'Saved drawings by rating; you can switch the folder here.'),
    });
    ctx.root.append(sheet.el);

    const pathLine = ctx.ui.msgline(t('正在读取…', 'Loading…'));
    const countLine = ctx.ui.msgline('');
    const statusLine = ctx.ui.msgline('');
    const row = ctx.ui.rowbar();
    let currentPath = '';

    // 原生链接 + 隐藏 iframe：点击由浏览器直接发 GET，不依赖客户端 fetch/onClick。
    const frameName = 'pet-draw-open-frame';
    const frame = doc.createElement('iframe');
    frame.name = frameName;
    frame.style.display = 'none';
    frame.setAttribute('aria-hidden', 'true');
    sheet.body.append(frame);

    const openLink = doc.createElement('a');
    openLink.className = 'btn primary';
    openLink.textContent = t('打开当前文件夹', 'Open folder');
    openLink.href = '/api/webui/providers/world:draw/panels/api/open';
    openLink.target = frameName;
    openLink.rel = 'noopener';
    openLink.addEventListener('click', () => {
      statusLine.classList.remove('bad');
      statusLine.textContent = t('已请求打开；如果没出现窗口，点“复制路径”到资源管理器里打开。', 'Opening… if nothing appears, use “Copy path”.');
    });

    const choose = async (): Promise<void> => {
      try {
        const picked = await ctx.pickPath({ kind: 'directory' });
        if (!picked) return;
        const result = await ctx.setConfig('world:draw', { 'worlds.draw.saveDir': picked });
        ctx.ui.toast(result || t('已保存', 'Saved'));
        await load();
      } catch (error) {
        statusLine.classList.add('bad');
        statusLine.textContent = message(error);
      }
    };

    const chooseButton = ctx.ui.button(t('选择文件夹', 'Choose folder'), {
      onClick: () => { void choose(); },
    });
    const copyButton = ctx.ui.copyButton(() => currentPath, {
      label: t('复制路径', 'Copy path'),
      size: 'sm',
      okText: t('路径已复制', 'Path copied'),
    });
    const refreshButton = ctx.ui.button(t('刷新', 'Refresh'), {
      size: 'sm',
      onClick: () => { void load(); },
    });
    if (typeof ctx.pickPath !== 'function') chooseButton.disabled = true;
    row.append(openLink, chooseButton, copyButton, refreshButton);
    sheet.body.append(pathLine, countLine, row, statusLine);

    const setError = (text: string): void => {
      pathLine.textContent = text;
      pathLine.classList.add('bad');
    };

    const load = async (): Promise<void> => {
      try {
        const info = await ctx.invoke<FolderInfo>('info');
        if (info.error) {
          setError(info.error);
          return;
        }
        currentPath = info.path;
        pathLine.classList.remove('bad');
        pathLine.textContent = info.fallback
          ? t(`当前：${info.path}（默认位置）`, `Current: ${info.path} (default)`)
          : t(`当前：${info.path}`, `Current: ${info.path}`);
        countLine.textContent = t(
          `共 ${info.total} 张 · 未评 ${info.counts.unrated ?? 0} · 最喜欢 ${info.counts.favorite ?? 0} · 喜欢 ${info.counts.like ?? 0} · 一般 ${info.counts.neutral ?? 0} · 不喜欢 ${info.counts.dislike ?? 0}`,
          `${info.total} saved · unrated ${info.counts.unrated ?? 0} · favorite ${info.counts.favorite ?? 0} · like ${info.counts.like ?? 0} · neutral ${info.counts.neutral ?? 0} · dislike ${info.counts.dislike ?? 0}`,
        );
      } catch (error) {
        setError(message(error));
      }
    };

    await load();
  },
};

export { folderPanel };
