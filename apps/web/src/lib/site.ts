import { env } from 'cloudflare:workers';

/**
 * 对外展示的站点 origin。
 *
 * - 本地开发保持 localhost；
 * - 生产用 `SITE_ORIGIN`（现在是 https://classygit.pages.dev）；
 * - 没配置时退回请求 origin，保证 Workers 直连也能用。
 */
export const siteOrigin = (url: URL): string => {
  if (import.meta.env.DEV) return url.origin;

  try {
    const configured = (env as { SITE_ORIGIN?: string }).SITE_ORIGIN;
    if (configured) return configured.replace(/\/+$/, '');
  } catch {
    // 非 Workers 运行时（例如纯 node 测试）退回请求 origin
  }

  return url.origin;
};
