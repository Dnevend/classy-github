/**
 * 从 URL 判断这是不是一个 GitHub 用户页，供 middleware 在解析默认主题时使用。
 *
 * 只有用户页才需要读 `classy.config.json`；静态资源、/setup、/badge 等
 * 长得像单段路径的入口不能拿去请求 GitHub。
 */

/** 这些单段路径不是用户页；新增顶层路由时记得同步 */
const RESERVED_ROOTS = new Set([
  'api',
  'badge',
  'card',
  'claim',
  'contrib',
  'cursors',
  'fonts',
  'images',
  'og',
  'random',
  'robots.txt',
  'setup',
  'sitemap',
  'sitemap.xml',
  'webring',
]);

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const FEED = /\/rss\.xml$/i;

export const userFromPath = (pathname: string): string | null => {
  if (FEED.test(pathname)) return null;

  const first = pathname.split('/')[1];
  if (!first) return null;

  let login: string;
  try {
    login = decodeURIComponent(first);
  } catch {
    return null;
  }

  // 先 decode 再判断保留字：/%73etup 也是 /setup
  if (RESERVED_ROOTS.has(login.toLowerCase())) return null;

  return LOGIN.test(login) ? login : null;
};
