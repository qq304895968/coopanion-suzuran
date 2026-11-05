/**
 * 作品页日期范围选择器：单月历 + 固定 96px 快捷侧栏 + 右下角「取消 / 确定」。
 *
 * 严格按验收要求的状态机工作：
 * - 第一次点击只记起点（主色高亮），面板保持打开；
 * - 悬浮显示起点到悬浮日的浅色范围预览；
 * - 第二次点击记终点（早于起点自动反转），面板仍然不关闭；
 * - 只有「确定」才把范围写回筛选条件并关闭；「取消」丢弃草稿。
 */
import {
  clickRangeDay,
  containsDay,
  EMPTY_RANGE,
  formatDate,
  formatDisplay,
  isComplete,
  monthCells,
  normalize,
  parseDate,
  previewRange,
  quickRange,
  sameDay,
  startOfDay,
  type DateRange,
  type QuickRangeKey,
} from './date-range-model.ts';
import { closePopover, openPopover } from './popover-stack.ts';

export interface DateRangeValue {
  from: string;
  to: string;
}

export interface DateRangePickerOptions {
  t: (zh: string, en: string) => string;
  onChange?: (range: DateRangeValue) => void;
  className?: string;
  /** 日历区同时显示的月份数：1=单月（默认），2=双月并排。 */
  months?: 1 | 2;
}

export interface DateRangePickerHandle {
  el: HTMLDivElement;
  getRange(): DateRangeValue;
  setRange(from: string, to: string): void;
  clear(): void;
  close(): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(pathData: string, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(className);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  svg.append(path);
  return svg;
}

const SHORTCUTS: Array<{ key: QuickRangeKey; zh: string; en: string }> = [
  { key: 'today', zh: '今天', en: 'Today' },
  { key: '7days', zh: '近 7 天', en: 'Last 7 days' },
  { key: '30days', zh: '近 30 天', en: 'Last 30 days' },
  { key: '90days', zh: '近 90 天', en: 'Last 90 days' },
  { key: 'month', zh: '本月', en: 'This month' },
  { key: 'all', zh: '全部', en: 'All' },
];

const WEEKDAYS_ZH = '日,一,二,三,四,五,六';
const WEEKDAYS_EN = 'Su,Mo,Tu,We,Th,Fr,Sa';

export function createDateRangePicker(init: DateRangePickerOptions): DateRangePickerHandle {
  const { t } = init;
  const monthCount = init.months === 2 ? 2 : 1;

  const root = document.createElement('div');
  root.className = 'date-range';
  if (init.className) root.classList.add(...init.className.split(/\s+/).filter(Boolean));

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'date-range-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');

  const valueEl = document.createElement('span');
  valueEl.className = 'date-range-value';

  trigger.append(svgIcon('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'date-range-cal-icon'), valueEl, svgIcon('M6 9l6 6 6-6', 'date-range-caret'));

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'date-range-clear';
  clearBtn.setAttribute('aria-label', t('清除日期范围', 'Clear date range'));
  clearBtn.title = t('清除日期范围', 'Clear date range');
  clearBtn.append(svgIcon('M18 6L6 18M6 6l12 12', 'date-range-clear-icon'));

  const popover = document.createElement('div');
  popover.className = 'date-range-popover';
  popover.setAttribute('role', 'dialog');
  popover.hidden = true;

  const body = document.createElement('div');
  body.className = 'date-range-body';

  const sidebar = document.createElement('div');
  sidebar.className = 'date-picker-sidebar';
  const shortcutButtons: Array<{ key: QuickRangeKey; el: HTMLButtonElement }> = SHORTCUTS.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-picker-shortcut';
    button.textContent = t(item.zh, item.en);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      applyShortcut(item.key);
    });
    sidebar.append(button);
    return { key: item.key, el: button };
  });

  const calendar = document.createElement('div');
  calendar.className = 'date-range-calendar';

  const head = document.createElement('div');
  head.className = 'date-range-cal-head';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'date-range-nav';
  prevBtn.setAttribute('aria-label', t('上个月', 'Previous month'));
  prevBtn.textContent = '‹';
  const titleEl = document.createElement('span');
  titleEl.className = 'date-range-cal-title';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'date-range-nav';
  nextBtn.setAttribute('aria-label', t('下个月', 'Next month'));
  nextBtn.textContent = '›';
  head.append(prevBtn, titleEl, nextBtn);

  const weekLabels = t(WEEKDAYS_ZH, WEEKDAYS_EN).split(',');
  // 单月：一个网格；双月：并排两个网格（各自带星期表头）
  const monthsWrap = document.createElement('div');
  monthsWrap.className = 'date-range-months';
  calendar.append(head, monthsWrap);
  body.append(sidebar, calendar);

  const footer = document.createElement('div');
  footer.className = 'date-range-footer';
  const hintEl = document.createElement('span');
  hintEl.className = 'date-range-hint';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-action default';
  cancelBtn.textContent = t('取消', 'Cancel');
  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'btn-action primary';
  confirmBtn.textContent = t('确定', 'Confirm');
  footer.append(hintEl, cancelBtn, confirmBtn);

  popover.append(body, footer);
  root.append(trigger, clearBtn, popover);

  let applied: DateRange = { ...EMPTY_RANGE };
  let draft: DateRange = { ...EMPTY_RANGE };
  let hover: Date | null = null;
  let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let open = false;
  let dayEls: Array<{ el: HTMLButtonElement; date: Date; outside: boolean }> = [];

  /** 触发器文案与清除按钮显隐。 */
  const syncLabel = (): void => {
    const bounds = normalize(applied);
    if (!bounds) {
      valueEl.textContent = t('年/月/日 — 年/月/日', 'YYYY/MM/DD — YYYY/MM/DD');
      valueEl.classList.add('is-placeholder');
      clearBtn.hidden = true;
      return;
    }
    valueEl.textContent = `${formatDisplay(bounds.from)} — ${formatDisplay(bounds.to)}`;
    valueEl.classList.remove('is-placeholder');
    clearBtn.hidden = false;
  };

  const syncFooter = (): void => {
    const bounds = normalize(draft);
    const complete = isComplete(draft);
    confirmBtn.disabled = !complete;
    if (bounds) {
      const days = Math.round((bounds.to.getTime() - bounds.from.getTime()) / 86400000) + 1;
      hintEl.textContent = `${formatDisplay(bounds.from)} — ${formatDisplay(bounds.to)} · ${t(`共 ${days} 天`, `${days} day${days > 1 ? 's' : ''}`)}`;
    } else if (draft.start) {
      hintEl.textContent = t('请选择结束日期', 'Select the end date');
    } else {
      hintEl.textContent = t('请选择开始日期', 'Select the start date');
    }
    hintEl.classList.toggle('is-complete', complete);
  };

  /** 只更新日期格的类名，避免悬浮时整块重建。 */
  const paint = (): void => {
    const bounds = normalize(draft);
    const preview = previewRange(draft, hover);
    const today = startOfDay(new Date());
    for (const cell of dayEls) {
      const { el, date } = cell;
      el.classList.toggle('is-outside', cell.outside);
      el.classList.toggle('is-today', sameDay(date, today));
      const isStart = !!draft.start && sameDay(date, draft.start);
      const isEnd = !!draft.end && sameDay(date, draft.end);
      el.classList.toggle('is-start', isStart);
      el.classList.toggle('is-end', isEnd);
      el.classList.toggle('is-in-range', !!bounds && containsDay(draft, date) && !isStart && !isEnd);
      el.classList.toggle('is-preview', !!preview && containsDay({ start: preview.from, end: preview.to }, date) && !isStart && !isEnd);
      el.classList.toggle('is-preview-start', !!preview && sameDay(date, preview.from) && !isStart);
      el.classList.toggle('is-preview-end', !!preview && sameDay(date, preview.to) && !isStart);
      el.setAttribute('aria-pressed', String(isStart || isEnd));
    }
    for (const item of shortcutButtons) {
      const quick = quickRange(item.key, new Date());
      const same = !!quick.start && !!normalize(draft) &&
        sameDay(quick.start, normalize(draft)!.from) && sameDay(quick.end ?? quick.start, normalize(draft)!.to);
      item.el.classList.toggle('is-active', same);
    }
  };

  const monthTitle = (date: Date): string => t(
    `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`,
    `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`,
  );

  const renderDays = (): void => {
    const months: Date[] = [];
    for (let offset = 0; offset < monthCount; offset += 1) {
      months.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1));
    }
    if (months.length === 1) {
      titleEl.textContent = monthTitle(months[0]!);
    } else {
      const first = months[0]!;
      const last = months[months.length - 1]!;
      titleEl.textContent = t(
        `${first.getFullYear()} 年 ${first.getMonth() + 1} 月 – ${last.getMonth() + 1} 月`,
        `${first.toLocaleString('en-US', { month: 'short' })} – ${last.toLocaleString('en-US', { month: 'short' })} ${last.getFullYear()}`,
      );
    }

    monthsWrap.replaceChildren();
    dayEls = [];
    for (const monthDate of months) {
      const block = document.createElement('div');
      block.className = 'date-range-month';

      const weekRow = document.createElement('div');
      weekRow.className = 'date-range-weekdays';
      for (const label of weekLabels) {
        const cell = document.createElement('span');
        cell.textContent = label;
        weekRow.append(cell);
      }

      const grid = document.createElement('div');
      grid.className = 'date-range-days';
      grid.setAttribute('role', 'grid');
      grid.setAttribute('aria-label', monthTitle(monthDate));

      for (const cell of monthCells(monthDate.getFullYear(), monthDate.getMonth())) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-range-day';
        button.textContent = String(cell.date.getDate());
        button.dataset.date = formatDate(cell.date);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          draft = clickRangeDay(draft, cell.date);
          hover = null;
          // 点到补位的跨月日期时，顺带把月历切到那个月
          if (cell.outside) {
            viewMonth = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1);
            renderDays();
          } else {
            paint();
          }
          syncFooter();
        });
        button.addEventListener('mouseenter', () => {
          if (draft.start && !draft.end) {
            hover = cell.date;
            paint();
          }
        });
        grid.append(button);
        dayEls.push({ el: button, date: cell.date, outside: cell.outside });
      }

      block.append(weekRow, grid);
      monthsWrap.append(block);
    }
    paint();
  };

  const resetDraft = (): void => {
    draft = {
      start: applied.start ? new Date(applied.start) : null,
      end: applied.end ? new Date(applied.end) : null,
    };
    hover = null;
    const anchor = draft.start ?? new Date();
    viewMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  };

  function close(): void {
    if (!open) return;
    open = false;
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    closePopover(close);
    document.removeEventListener('mousedown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  /** 取消：丢弃本次草稿，不写回筛选条件。 */
  const cancel = (): void => {
    resetDraft();
    close();
  };

  const emit = (): void => {
    const bounds = normalize(applied);
    init.onChange?.({ from: bounds ? formatDate(bounds.from) : '', to: bounds ? formatDate(bounds.to) : '' });
  };

  const confirm = (): void => {
    const bounds = normalize(draft);
    if (!bounds) return;
    applied = { start: new Date(bounds.from), end: new Date(bounds.to) };
    draft = { start: new Date(bounds.from), end: new Date(bounds.to) };
    hover = null;
    syncLabel();
    close();
    emit();
  };

  const applyShortcut = (key: QuickRangeKey): void => {
    const quick = quickRange(key, new Date());
    draft = { start: quick.start, end: quick.end };
    hover = null;
    const anchor = draft.start ?? new Date();
    viewMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    renderDays();
    syncFooter();
  };

  const onPointerDown = (event: MouseEvent): void => {
    if (!root.contains(event.target as Node)) cancel();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cancel();
      trigger.focus();
    }
  };

  const openPicker = (): void => {
    if (open) return;
    resetDraft();
    open = true;
    openPopover(close);
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    renderDays();
    syncFooter();
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (open) cancel();
    else openPicker();
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  });

  prevBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderDays();
  });

  nextBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderDays();
  });

  monthsWrap.addEventListener('mouseleave', () => {
    if (hover) {
      hover = null;
      paint();
    }
  });

  cancelBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    cancel();
  });

  confirmBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    confirm();
  });

  clearBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    applied = { ...EMPTY_RANGE };
    draft = { ...EMPTY_RANGE };
    hover = null;
    syncLabel();
    close();
    emit();
  });

  popover.addEventListener('click', (event) => event.stopPropagation());

  syncLabel();

  return {
    el: root,
    getRange: () => {
      const bounds = normalize(applied);
      return { from: bounds ? formatDate(bounds.from) : '', to: bounds ? formatDate(bounds.to) : '' };
    },
    setRange: (from: string, to: string) => {
      const start = parseDate(from);
      const end = parseDate(to);
      applied = { start, end };
      draft = { start: start ? new Date(start) : null, end: end ? new Date(end) : null };
      hover = null;
      syncLabel();
    },
    clear: () => {
      applied = { ...EMPTY_RANGE };
      draft = { ...EMPTY_RANGE };
      hover = null;
      syncLabel();
      close();
      emit();
    },
    close: cancel,
    destroy: () => {
      close();
      root.remove();
    },
  };
}
