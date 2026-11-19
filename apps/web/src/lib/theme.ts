import type { ThemeName } from './config';

/**
 * 主题名的唯一来源。
 * config.ts（校验）、themes/index.ts（注册表）、页面（解析 URL）都从这里取。
 */
export const THEME_NAMES = ['nes', 'mac', 'win98', 'tui'] as const;

export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value);

/**
 * 主题的亮/暗归属，必须与各主题 `theme.css` 里的 `color-scheme` 一致。
 * README 里 GitHub 的 `#gh-light-mode-only` / `#gh-dark-mode-only`
 * 主题变体图片按它取舍（见 lib/theme-images.ts）。
 */
export const THEME_COLOR_SCHEMES: Record<ThemeName, 'light' | 'dark'> = {
  nes: 'dark',
  mac: 'light',
  win98: 'light',
  tui: 'dark',
};

export const themeColorScheme = (name: ThemeName): 'light' | 'dark' =>
  THEME_COLOR_SCHEMES[name];

/**
 * `?theme=` / cookie 的解析规则。
 * 纯函数，方便在 node 里断言；主题是服务端渲染的维度，
 * 持久化靠 cookie，不在浏览器端切 class（四套主题的 DOM 结构不同）。
 */
/**
 * 严格解析：不是合法主题名就返回 null（用于区分「没选」和「选了旧主题」）。
 * `default` / `win95` 是已退役的旧名字，仍然兼容到当前主题。
 */
export const parseThemeName = (value?: string | null): ThemeName | null => {
  const normalized = value?.trim().toLowerCase();
  // 兼容旧链接与旧 cookie：default 已退役，由 mac 接管；win95 现在叫 win98
  if (normalized === 'default') return 'mac';
  if (normalized === 'win95') return 'win98';
  return isThemeName(normalized) ? normalized : null;
};

export const parseThemeParam = (value?: string | null): ThemeName =>
  parseThemeName(value) ?? 'mac';

export const THEME_COOKIE = 'classy_theme';

export interface ThemeChoice {
  theme: ThemeName;
  /** 是否应该把这次解析出的主题写进 cookie */
  persist: boolean;
}

/**
 * 主题解析优先级：`?theme=` > cookie > 站主配置的默认主题 > `mac`。
 *
 * 主题是服务端渲染的维度（四套主题 DOM 不同），所以「持久化」= 记住选择 +
 * 让缓存键带上主题；不能靠浏览器端换 class。
 */
export const resolveThemeChoice = ({
  param,
  cookie,
  fallback = 'mac',
}: {
  param?: string | null;
  cookie?: string | null;
  /** 站主配置的默认主题；没有配置或读取失败时传 mac */
  fallback?: ThemeName;
}): ThemeChoice => {
  const fromParam = parseThemeName(param);
  if (fromParam) return { theme: fromParam, persist: true };

  const fromCookie = parseThemeName(cookie);
  if (fromCookie) return { theme: fromCookie, persist: false };

  return { theme: parseThemeName(fallback) ?? 'mac', persist: false };
};
