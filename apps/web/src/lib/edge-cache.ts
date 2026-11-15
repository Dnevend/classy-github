/**
 * Workers Cache API 的薄封装。
 *
 * 关键点：`caches.default.match()` **不会**因为条目的 max-age 过期而返回 undefined，
 * 它会把老条目一直给你，直到被淘汰。所以 TTL 必须自己记、自己判。
 * 否则「缓存 5 分钟」会变成「缓存到天荒地老」（线上踩过：改了配置一小时不生效）。
 */

export const CACHED_AT_HEADER = 'x-classy-cached-at';

export const edgeCache = (): Cache | undefined => {
  const runtime = globalThis as unknown as { caches?: { default?: Cache } };
  return runtime.caches?.default;
};

/** 命中且未过期时返回响应，否则返回 undefined */
export const cacheGet = async (
  key: Request,
  ttlSeconds: number
): Promise<Response | undefined> => {
  const cache = edgeCache();
  if (!cache) return undefined;

  const hit = await cache.match(key);
  if (!hit) return undefined;

  const cachedAt = Number(hit.headers.get(CACHED_AT_HEADER) ?? 0);
  if (!cachedAt || Date.now() - cachedAt > ttlSeconds * 1000) return undefined;

  return hit;
};

/** 写一份带时间戳的副本，调用方的响应不受影响 */
export const cachePut = async (
  key: Request,
  response: Response,
  ttlSeconds: number
): Promise<void> => {
  const cache = edgeCache();
  if (!cache) return;

  const copy = response.clone();
  copy.headers.set('cache-control', `public, s-maxage=${ttlSeconds}`);
  copy.headers.set(CACHED_AT_HEADER, String(Date.now()));

  await cache.put(key, copy).catch(() => undefined);
};
