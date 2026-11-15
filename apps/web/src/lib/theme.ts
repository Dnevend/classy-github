import type { ThemeName } from './config';

/**
 * 主题名的唯一来源。
 * config.ts（校验）、themes/index.ts（注册表）、页面（解析 URL）都从这里取。
 */
export const THEME_NAMES = ['default', 'nes', 'mac', 'win95', 'tui'] as const;

export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value);

/**
 * `?theme=` 的解析规则。
 * 纯函数，方便在 node 里断言；主题是 URL 维度，不做 cookie 维度
 * （四套主题的 DOM 结构不同，浏览器端切不了）。
 */
/** 严格解析：不是合法主题名就返回 null（用于区分「没选」和「选了 default」） */
export const parseThemeName = (value?: string | null): ThemeName | null => {
  const normalized = value?.trim().toLowerCase();
  return isThemeName(normalized) ? normalized : null;
};

export const parseThemeParam = (value?: string | null): ThemeName =>
  parseThemeName(value) ?? 'mac';

export const THEME_COOKIE = 'classy_theme';

export interface ThemeChoice {
  theme: ThemeName;
  /** 是否应该把这次选择写进 cookie */
  persist: boolean;
}

/**
 * 主题解析优先级：`?theme=` > cookie > default。
 *
 * 主题是服务端渲染的维度（四套主题 DOM 不同），所以「持久化」= 记住选择 +
 * 让缓存键带上主题；不能靠浏览器端换 class。
 */
export const resolveThemeChoice = ({
  param,
  cookie,
}: {
  param?: string | null;
  cookie?: string | null;
}): ThemeChoice => {
  const fromParam = parseThemeName(param);
  if (fromParam) return { theme: fromParam, persist: true };

  const fromCookie = parseThemeName(cookie);
  if (fromCookie) return { theme: fromCookie, persist: false };

  return { theme: 'mac', persist: false };
};
