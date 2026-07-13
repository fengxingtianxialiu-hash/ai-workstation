export { registerTheme, getAllThemes, getTheme, applyTheme } from './registry';
export type { ThemeDefinition } from './registry';
export { dayTheme } from './day';
export { nightTheme } from './night';

import { registerTheme } from './registry';
import { dayTheme } from './day';
import { nightTheme } from './night';

/**
 * 初始化：注册所有内置主题
 */
export function initThemes(): void {
  registerTheme(dayTheme);
  registerTheme(nightTheme);
}
