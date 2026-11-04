/** 包入口：默认导出 `WorldDefinition`，加载器按 `cortico.kind === 'world'` 认它。 */
import { DRAW } from './definition.ts';

export default DRAW;
export { DRAW };
export type { DrawConfigSection } from './config.ts';
