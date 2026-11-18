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

const matchCached = async (key: Request): Promise<Response | undefined> => {
  const cache = edgeCache();
  if (!cache) return undefined;

  return (await cache.match(key)) ?? undefined;
};

/** 缓存的年龄（秒）；没有时间戳的老条目返回 null，不能猜。 */
const ageOf = (response: Response): number | null => {
  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER) ?? 0);
  if (!cachedAt) return null;

  return (Date.now() - cachedAt) / 1000;
};

/** 命中且未过期时返回响应，否则返回 undefined */
export const cacheGet = async (
  key: Request,
  ttlSeconds: number
): Promise<Response | undefined> => {
  const hit = await matchCached(key);
  if (!hit) return undefined;

  const age = ageOf(hit);
  if (age === null || age > ttlSeconds) return undefined;

  return hit;
};

/**
 * 读「过期但还能兜底」的缓存。
 *
 * 用在 GitHub 限流 / 5xx / 网络错误时：旧数据比错误页好。调用方必须自己
 * 控制 staleTtl，避免拿几周前的数据当现在。
 */
export const cacheGetStale = async (
  key: Request,
  staleTtlSeconds: number
): Promise<Response | undefined> => {
  const hit = await matchCached(key);
  if (!hit) return undefined;

  const age = ageOf(hit);
  if (age === null || age > staleTtlSeconds) return undefined;

  return hit;
};

/** 删除缓存条目；没有 Cache API 时静默跳过。 */
export const cacheDelete = async (key: Request): Promise<void> => {
  const cache = edgeCache();
  if (!cache) return;

  await cache.delete(key).catch(() => false);
};

/** 写一份带时间戳的副本，调用方的响应不受影响 */
export const cachePut = async (
  key: Request,
  response: Response,
  ttlSeconds: number,
  /**
   * 写进缓存副本的 s-maxage。SWR / stale 兜底需要条目比逻辑 TTL 活得更久，
   * 否则部分运行时会在 s-maxage 到期时直接淘汰条目，stale 永远读不到。
   */
  headerTtlSeconds = ttlSeconds
): Promise<void> => {
  const cache = edgeCache();
  if (!cache) return;

  const copy = response.clone();
  copy.headers.set('cache-control', `public, s-maxage=${headerTtlSeconds}`);
  copy.headers.set(CACHED_AT_HEADER, String(Date.now()));

  await cache.put(key, copy).catch(() => undefined);
};
