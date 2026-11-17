import { CACHED_AT_HEADER, cacheGetStale } from './edge-cache.ts';

/** GitHub 挂掉时最多拿多旧的 HTML 兜底。 */
export const STALE_HTML_TTL = 60 * 60 * 24;

const STALE_STATUSES = new Set([500, 502, 503, 504]);

/** 只有上游故障才回退旧页面；404 不兜底，页面可能真的被删了。 */
export const isStaleEligible = (status: number): boolean =>
  STALE_STATUSES.has(status);

/**
 * 用同一路径 / 主题 / 语言构造旧缓存版本的 key。
 *
 * 部署时 `CACHE_VERSION` +1 会让新版本看不到旧版本的 HTML；在配额已经
 * 耗尽的情况下，旧缓存仍然比 503 好。只用于 stale 兜底，不做正常命中。
 */
export const previousCacheKey = (
  key: Request,
  version: string
): Request => {
  const url = new URL(key.url);
  url.searchParams.set('v', version);

  return new Request(url.toString(), { method: 'GET' });
};

/**
 * 上游 5xx / 限流时返回同一主题、同一语言下的旧 HTML。
 * 返回 undefined 表示没有可用旧缓存，调用方继续返回原错误。
 */
export const serveStaleHtml = async (
  key: Request,
  upstreamStatus: number,
  staleTtl = STALE_HTML_TTL
): Promise<Response | undefined> => {
  if (!isStaleEligible(upstreamStatus)) return undefined;

  const stale = await cacheGetStale(key, staleTtl);
  if (!stale) return undefined;

  const response = new Response(stale.body, stale);
  response.headers.delete(CACHED_AT_HEADER);
  response.headers.set('x-classy-cache', 'STALE');
  response.headers.set('x-classy-stale', '1');
  response.headers.set('cache-control', 'public, s-maxage=30');

  return response;
};
