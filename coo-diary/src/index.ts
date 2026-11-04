/** 包入口:默认导出 `WorldDefinition`,加载器按 `cortico.kind === 'world'` 认它。 */
import { DIARY } from './definition.ts';

export default DIARY;
export { DIARY };
export type { DiaryConfigSection } from './config.ts';
