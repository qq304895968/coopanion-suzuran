/**
 * 画室通用自定义下拉（`button` 触发 + `ul/li` Portal 弹层）。
 *
 * 严禁使用原生 `<select>`，避免系统原生蓝底；
 * 弹层挂载到 `document.body`（Portal），不受父容器 overflow 裁切；
 * Hover 态统一走浅灰 `#F3F4F6`，选中态走主题主色变量。
 */
import { closePopover, openPopover } from './popover-stack.ts';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownOptions {
  /** 追加到外层 `.coo-dd` 的类名，例如 `coo-filter-model`。 */
  className?: string;
  options?: readonly DropdownOption[];
  value?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  /** 弹层顶部加搜索框，用于过滤长选项（如采样器）。默认不开启。 */
  searchable?: boolean;
  onChange?: (value: string, option: DropdownOption | undefined) => void;
}

export interface DropdownHandle {
  el: HTMLDivElement;
  trigger: HTMLButtonElement;
  list: HTMLUListElement;
  getValue(): string;
  setValue(value: string, notify?: boolean): void;
  setOptions(options: readonly DropdownOption[]): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 下拉触发器的统一箭头；LoRA 多选弹层复用。 */
export function createCaretIcon(): SVGSVGElement {
  return caretIcon();
}

function caretIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('coo-dd-caret');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 9l6 6 6-6');
  svg.append(path);
  return svg;
}

function checkIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('coo-dd-check');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M20 6L9 17l-5-5');
  svg.append(path);
  return svg;
}

export function createDropdown(init: DropdownOptions = {}): DropdownHandle {
  const root = document.createElement('div');
  root.className = 'coo-dd';
  if (init.className) root.classList.add(...init.className.split(/\s+/).filter(Boolean));

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'coo-dd-trigger coo-dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (init.ariaLabel) trigger.setAttribute('aria-label', init.ariaLabel);

  const valueEl = document.createElement('span');
  valueEl.className = 'coo-dd-value';

  trigger.append(valueEl, caretIcon());

  const list = document.createElement('ul');
  list.className = 'coo-dd-list coo-dd-portal';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  if (init.ariaLabel) list.setAttribute('aria-label', init.ariaLabel);

  root.append(trigger);

  let options: DropdownOption[] = [...(init.options ?? [])];
  let displayOptions = options;
  let value = init.value ?? '';
  let open = false;
  const searchable = !!init.searchable;
  let searchInput: HTMLInputElement | null = null;
  if (searchable) {
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = init.searchPlaceholder ?? '';
    searchInput.className = 'coo-dd-search';
    searchInput.addEventListener('input', () => {
      const q = searchInput!.value.trim().toLowerCase();
      displayOptions = q
        ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
        : options;
      renderList();
      if (open) positionList();
    });
  }

  const optionEls = (): HTMLLIElement[] => Array.from(list.querySelectorAll<HTMLLIElement>('li.coo-dd-option'));

  const renderList = (): void => {
    list.replaceChildren();
    if (searchable && searchInput) {
      const wrap = document.createElement('li');
      wrap.className = 'coo-dd-search-wrap';
      wrap.append(searchInput);
      list.append(wrap);
    }
    for (const option of displayOptions) {
      const li = document.createElement('li');
      li.className = 'coo-dd-option';
      li.setAttribute('role', 'option');
      li.tabIndex = -1;
      li.dataset.value = option.value;
      const label = document.createElement('span');
      label.className = 'coo-dd-option-label';
      label.textContent = option.label;
      li.append(label, checkIcon());
      li.setAttribute('aria-selected', String(option.value === value));
      li.classList.toggle('is-selected', option.value === value);
      li.addEventListener('click', (event) => {
        event.stopPropagation();
        choose(option);
      });
      list.append(li);
    }
  };

  const syncLabel = (): void => {
    const current = options.find((option) => option.value === value);
    valueEl.textContent = current ? current.label : (options[0]?.label ?? '');
    valueEl.classList.toggle('is-placeholder', !current);
  };

  const positionList = (): void => {
    if (!open) return;
    if (!trigger.isConnected) {
      close();
      return;
    }
    const doc = trigger.ownerDocument;
    const win = doc.defaultView;
    const rect = trigger.getBoundingClientRect();
    const vw = win?.innerWidth || doc.documentElement.clientWidth || 1200;
    const vh = win?.innerHeight || doc.documentElement.clientHeight || 800;
    const minW = Math.max(rect.width, 110);
    const maxW = Math.max(minW, Math.min(vw - 16, Math.max(rect.width, 360)));
    const left = Math.max(8, Math.min(rect.left, vw - minW - 8));

    list.style.position = 'fixed';
    list.style.minWidth = `${minW}px`;
    list.style.maxWidth = `${maxW}px`;
    list.style.left = `${left}px`;
    list.style.zIndex = '1000';

    const maxH = 280;
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      list.style.top = 'auto';
      list.style.bottom = `${Math.max(8, vh - rect.top + 4)}px`;
      list.style.maxHeight = `${Math.min(maxH, Math.max(100, spaceAbove - 4))}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top = `${rect.bottom + 4}px`;
      list.style.maxHeight = `${Math.min(maxH, Math.max(100, spaceBelow - 4))}px`;
    }
  };

  const moveFocus = (delta: number): void => {
    const items = optionEls();
    if (!items.length) return;
    const doc = trigger.ownerDocument;
    const active = doc.activeElement as HTMLElement | null;
    let index = items.indexOf(active as HTMLLIElement);
    if (index < 0) index = items.findIndex((item) => item.dataset.value === value);
    if (index < 0) index = delta > 0 ? -1 : 0;
    const next = Math.min(items.length - 1, Math.max(0, index + delta));
    items[next]?.focus({ preventScroll: true });
    items[next]?.scrollIntoView({ block: 'nearest' });
  };

  const onDocumentPointerDown = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (target && (root.contains(target) || list.contains(target))) return;
    close();
  };

  const onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
      trigger.focus();
    }
  };

  const onDocumentScroll = (event: Event): void => {
    if (event.target && list.contains(event.target as Node)) return;
    positionList();
  };

  function close(): void {
    if (!open) return;
    open = false;
    const doc = trigger.ownerDocument;
    list.hidden = true;
    list.remove();
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    closePopover(close);
    doc.removeEventListener('mousedown', onDocumentPointerDown, true);
    doc.removeEventListener('keydown', onDocumentKeyDown, true);
    doc.removeEventListener('scroll', onDocumentScroll, true);
    doc.defaultView?.removeEventListener('resize', positionList);
  }

  function openList(focusSelected = true): void {
    if (!options.length || open) return;
    if (searchable && searchInput) {
      searchInput.value = '';
    }
    displayOptions = options;
    renderList();

    open = true;
    openPopover(close);
    const doc = trigger.ownerDocument;
    (doc.body ?? root).appendChild(list);
    list.hidden = false;
    positionList();
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    doc.addEventListener('mousedown', onDocumentPointerDown, true);
    doc.addEventListener('keydown', onDocumentKeyDown, true);
    doc.addEventListener('scroll', onDocumentScroll, true);
    doc.defaultView?.addEventListener('resize', positionList);

    if (searchable && searchInput) {
      searchInput.focus({ preventScroll: true });
    } else if (focusSelected) {
      const target = optionEls().find((item) => item.dataset.value === value) ?? optionEls()[0];
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest' });
    }
  }

  function choose(option: DropdownOption): void {
    const changed = option.value !== value;
    value = option.value;
    syncLabel();
    for (const item of optionEls()) {
      const selected = item.dataset.value === value;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', String(selected));
    }
    close();
    trigger.focus();
    if (changed) init.onChange?.(value, option);
  }

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (open) close();
    else openList(true);
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openList(true);
    }
  });

  list.addEventListener('keydown', (event) => {
    const inSearch = searchable && event.target === searchInput;
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(-1); }
    else if (event.key === 'Home' && !inSearch) { event.preventDefault(); optionEls()[0]?.focus(); }
    else if (event.key === 'End' && !inSearch) { event.preventDefault(); optionEls().at(-1)?.focus(); }
    else if (event.key === 'Enter' || (event.key === ' ' && !inSearch)) {
      event.preventDefault();
      const doc = trigger.ownerDocument;
      const focused = doc.activeElement as HTMLElement | null;
      const option = options.find((item) => item.value === focused?.dataset.value)
        ?? (inSearch ? displayOptions[0] : undefined);
      if (option) choose(option);
    } else if (event.key === 'Tab') {
      close();
    }
  });

  renderList();
  syncLabel();

  return {
    el: root,
    trigger,
    list,
    getValue: () => value,
    setValue: (next: string, notify = false) => {
      if (next === value) return;
      value = next;
      syncLabel();
      for (const item of optionEls()) {
        const selected = item.dataset.value === value;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
      }
      if (notify) init.onChange?.(value, options.find((option) => option.value === value));
    },
    setOptions: (next: readonly DropdownOption[]) => {
      options = [...next];
      if (!options.some((option) => option.value === value)) value = options[0]?.value ?? '';
      const q = searchInput?.value.trim().toLowerCase() ?? '';
      displayOptions = q
        ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
        : options;
      renderList();
      syncLabel();
      if (open) positionList();
    },
    close,
    isOpen: () => open,
    destroy: () => {
      close();
      root.remove();
    },
  };
}
