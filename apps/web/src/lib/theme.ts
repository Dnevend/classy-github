import type { ThemeName } from './config';

/**
 * 主题名的唯一来源。
 * config.ts（校验）、themes/index.ts（注册表）、页面（解析 URL）都从这里取。
 */
export const THEME_NAMES = ['default', 'nes', 'mac', 'win95'] as const;

export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value);

/**
 * `?theme=` 的解析规则。
 * 纯函数，方便在 node 里断言；主题是 URL 维度，不做 cookie 维度
 * （四套主题的 DOM 结构不同，浏览器端切不了）。
 */
export const parseThemeParam = (value?: string | null): ThemeName => {
  const normalized = value?.trim().toLowerCase();
  return isThemeName(normalized) ? normalized : 'default';
};
