/**
 * 作品页的自定义下拉（`button` 触发 + `ul/li` 弹层）。
 *
 * 不使用原生 `<select>`，避免 Windows 下出现亮蓝色系统 Hover 态；
 * 选中/Hover 统一走 `.coo-dd-option:hover` 与 `.is-selected`（浅灰底）。
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
  /** 弹层顶部加搜索框，用于过滤长选项（如采样器）。默认不开启，不影响现有调用。 */
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
  trigger.className = 'coo-dd-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (init.ariaLabel) trigger.setAttribute('aria-label', init.ariaLabel);

  const valueEl = document.createElement('span');
  valueEl.className = 'coo-dd-value';

  trigger.append(valueEl, caretIcon());

  const list = document.createElement('ul');
  list.className = 'coo-dd-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  if (init.ariaLabel) list.setAttribute('aria-label', init.ariaLabel);

  root.append(trigger, list);

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
      const q = searchInput!.value.toLowerCase();
      displayOptions = options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
      );
      renderList();
    });
  }

  const optionEls = (): HTMLLIElement[] => Array.from(list.querySelectorAll<HTMLLIElement>('li.coo-dd-option'));

  const renderList = (): void => {
    list.replaceChildren();
    if (searchable && searchInput) {
      const wrap = document.createElement('li');
      wrap.className = 'coo-dd-search-wrap';
      wrap.append(searchInput!);
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

  const moveFocus = (delta: number): void => {
    const items = optionEls();
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    let index = items.indexOf(active as HTMLLIElement);
    if (index < 0) index = items.findIndex((item) => item.dataset.value === value);
    if (index < 0) index = delta > 0 ? -1 : 0;
    const next = Math.min(items.length - 1, Math.max(0, index + delta));
    items[next]?.focus();
  };

  const onDocumentPointerDown = (event: MouseEvent): void => {
    if (!root.contains(event.target as Node)) close();
  };

  const onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
      trigger.focus();
    }
  };

  function close(): void {
    if (!open) return;
    open = false;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    closePopover(close);
    document.removeEventListener('mousedown', onDocumentPointerDown, true);
    document.removeEventListener('keydown', onDocumentKeyDown, true);
  }

  function openList(focusSelected = true): void {
    if (!options.length) return;
    displayOptions = options;
    if (open) return;
    open = true;
    openPopover(close);
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    document.addEventListener('mousedown', onDocumentPointerDown, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    if (focusSelected) {
      const target = optionEls().find((item) => item.dataset.value === value) ?? optionEls()[0];
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
    }
    if (searchable) {
      searchInput?.focus();
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
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(-1); }
    else if (event.key === 'Home') { event.preventDefault(); optionEls()[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); optionEls().at(-1)?.focus(); }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const focused = document.activeElement as HTMLElement | null;
      const option = options.find((item) => item.value === focused?.dataset.value);
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
      renderList();
      syncLabel();
    },
    close,
    isOpen: () => open,
    destroy: () => {
      close();
      root.remove();
    },
  };
}
