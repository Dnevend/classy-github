/**
 * 路由级边缘缓存策略。
 *
 * 放在纯模块里，方便在 node 里断言；middleware 只负责接线。
 * 顺序敏感：先匹配更具体的路径。
 */
export const ROUTE_TTL: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/$/, 3600],
  [/^\/webring\/?$/, 300],
  [/^\/badge\/[^/]+\.svg$/, 86400],
  [/^\/og\/[^/]+\.png$/, 86400],
  [/^\/card\/[^/]+$/, 600],
  [/^\/contrib\/[^/]+\.json$/, 300],
  [/^\/sitemap(?:\.xml|\/[\w.-]+\.xml)$/, 3600],
  [/^\/robots\.txt$/, 300],
  [/^\/[^/]+\/gist\/[^/]+\/?$/, 3600],
  [/^\/[^/]+\/rss\.xml$/, 3600],
  [/^\/[^/]+\/archive\/?$/, 300],
  [/^\/[^/]+\/guestbook\/?$/, 300],
  [/^\/[^/]+\/(?:repos|gists)\/?$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/.+$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/?$/, 300],
  [/^\/[^/]+\/?$/, 300],
];

/**
 * 这些路径不能被 middleware 缓存：
 * - setup / random 带查询参数或重定向；
 * - api 自己管理响应头。
 * robots / sitemap / contrib / card 已进入 ROUTE_TTL。
 */
export const SKIP_CACHE = /^\/(?:setup|random|api)(?:\/|$)/;

export const ttlFor = (pathname: string): number | undefined =>
  ROUTE_TTL.find(([pattern]) => pattern.test(pathname))?.[1];

export const shouldSkipCache = (pathname: string): boolean =>
  SKIP_CACHE.test(pathname);
