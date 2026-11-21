/**
 * 互斥弹层注册表：作品页的日期面板、模型/LoRA/排序下拉共用。
 * 打开一个弹层时自动关闭其它弹层，避免叠在一起。
 */

type Closer = () => void;

const openers = new Set<Closer>();

/** 注册当前弹层为“唯一展开”，并关闭其它已展开的弹层。 */
export function openPopover(close: Closer): void {
  for (const other of [...openers]) {
    if (other !== close) other();
  }
  openers.add(close);
}

/** 弹层关闭时注销。 */
export function closePopover(close: Closer): void {
  openers.delete(close);
}

/** 全部关闭（例如切换到批量模式、面板卸载）。 */
export function closeAllPopovers(): void {
  for (const other of [...openers]) other();
  openers.clear();
}
