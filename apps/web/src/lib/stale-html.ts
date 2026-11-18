import {
  CACHED_AT_HEADER,
  cacheDelete,
  cacheGetStale,
  cachePut,
} from './edge-cache.ts';
import { singleFlight } from './single-flight.ts';

/** GitHub 挂掉时最多拿多旧的 HTML 兜底。 */
export const STALE_HTML_TTL = 60 * 60 * 24;

/**
 * 正常过期后，仍可以先返回旧 HTML 的时间窗口。
 *
 * 6 小时是「比 5 分钟 TTL 宽、又不至于拿半天前的数据当现在」的折中；
 * 命中后会在后台重新渲染，所以第二个访客就能看到新内容。
 */
export const SWR_STALE_TTL = 60 * 60 * 6;

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

export interface StaleWhileRevalidateOptions {
  key: Request;
  /** 旧 HTML 允许的最大年龄（秒） */
  staleTtl: number;
  /** 后台刷新成功后写回缓存的 TTL（秒） */
  ttl: number;
  /** 重新渲染页面 */
  revalidate: () => Promise<Response>;
  /** Cloudflare 的 ExecutionContext.waitUntil；没有它就不做 SWR */
  waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * 过期 HTML 的 stale-while-revalidate。
 *
 * 先返回旧页面，再在 `waitUntil` 里重新渲染并写回缓存；同一 key 的并发
 * 请求通过 single-flight 合并，避免缓存刚过期时一批访客同时回源。
 * 没有可用旧页面时返回 undefined，调用方继续正常渲染。
 */
export const serveStaleWhileRevalidate = async ({
  key,
  staleTtl,
  ttl,
  revalidate,
  waitUntil,
}: StaleWhileRevalidateOptions): Promise<Response | undefined> => {
  const stale = await cacheGetStale(key, staleTtl);
  if (!stale) return undefined;

  const cachedAt = Number(stale.headers.get(CACHED_AT_HEADER) ?? 0);
  const age = cachedAt
    ? Math.max(0, Math.round((Date.now() - cachedAt) / 1000))
    : null;

  const refresh = singleFlight(`swr:${key.url}`, async () => {
    try {
      const fresh = await revalidate();

      // 用户真的被删了：删掉旧条目，别让 404 之后还继续返回旧主页。
      if (fresh.status === 404) {
        await cacheDelete(key);
        return;
      }

      // 5xx / 限流：保留旧 HTML，等下一次请求再试。
      if (fresh.status !== 200 && fresh.status !== 302) return;

      const copy = new Response(fresh.body, fresh);
      // Set-Cookie 不能进缓存，否则会把某个访客的主题/语言发给所有人。
      copy.headers.delete('set-cookie');
      await cachePut(key, copy, ttl, staleTtl);
    } catch (error) {
      console.warn(`[classy] SWR 后台刷新失败 ${key.url}:`, error);
    }
  });

  waitUntil(refresh);

  const response = new Response(stale.body, stale);
  response.headers.delete(CACHED_AT_HEADER);
  response.headers.set('x-classy-cache', 'STALE');
  response.headers.set('x-classy-swr', '1');
  if (age !== null) response.headers.set('x-classy-cache-age', String(age));
  response.headers.set('cache-control', 'public, s-maxage=30');

  return response;
};
