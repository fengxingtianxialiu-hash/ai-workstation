/**
 * 主题注册表
 * 每个主题是一组 CSS 变量值
 */
export interface ThemeDefinition {
  id: string;
  name: string;
  /** 主题图标（emoji 或 icon class） */
  icon: string;
  /** CSS 变量键值对 */
  variables: Record<string, string>;
}

/** 主题注册表 */
const themeRegistry = new Map<string, ThemeDefinition>();

/**
 * 注册一个主题
 */
export function registerTheme(theme: ThemeDefinition): void {
  themeRegistry.set(theme.id, theme);
}

/**
 * 获取所有已注册主题
 */
export function getAllThemes(): ThemeDefinition[] {
  return Array.from(themeRegistry.values());
}

/**
 * 获取指定主题
 */
export function getTheme(id: string): ThemeDefinition | undefined {
  return themeRegistry.get(id);
}

/**
 * 应用主题到 DOM
 */
export function applyTheme(themeId: string): boolean {
  const theme = themeRegistry.get(themeId);
  if (!theme) return false;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute('data-theme', themeId);
  return true;
}
