import type { ThemeName } from './config.ts';
import { parseThemeName, resolveThemeChoice, type ThemeChoice } from './theme.ts';
import { userFromPath } from './user-route.ts';

export interface RequestThemeOptions {
  pathname: string;
  param?: string | null;
  cookie?: string | null;
  /** 预览请求绕过主题缓存，读取最新配置 */
  fresh?: boolean;
  /** 返回站主配置的默认主题；失败时应抛错，由这里回退 mac */
  loadConfigTheme: (login: string, fresh: boolean) => Promise<ThemeName>;
}

/**
 * 把「URL/cookie 优先级」和「用户页要读配置」串起来。
 * 抽成纯函数是为了能在 node 里用 stub 断言，不必启动 Astro middleware。
 */
export const resolveRequestTheme = async ({
  pathname,
  param,
  cookie,
  fresh = false,
  loadConfigTheme,
}: RequestThemeOptions): Promise<ThemeChoice> => {
  const explicit = Boolean(parseThemeName(param) || parseThemeName(cookie));
  let fallback: ThemeName = 'mac';

  if (!explicit) {
    const login = userFromPath(pathname);
    if (login) {
      try {
        fallback = await loadConfigTheme(login, fresh);
      } catch {
        // 配置读取失败不能阻塞主题解析
      }
    }
  }

  return resolveThemeChoice({ param, cookie, fallback });
};
