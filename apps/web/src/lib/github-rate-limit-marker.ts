import { cacheGet, cachePut } from './edge-cache.ts';
import type { RateLimitInfo } from './github-error.ts';
import {
  RATE_LIMIT_LOCK_MAX,
  rateLimitLockUntil,
} from './github-rate-limit.ts';

/**
 * 全局限流熔断标记。
 *
 * REST core 和 GraphQL 各有独立配额，所以按 resource 分开存；一个端点
 * 看到 remaining=0 之后，同一 resource 的其他请求直接走 stale / 快速失败。
 */
export interface RateLimitMarker {
  __classy: 'rate-limit';
  resource: string;
  until: number;
  resetAt?: number;
  retryAfter?: number;
}

export const rateLimitMarkerKey = (resource: string): Request =>
  new Request(
    `https://classy.cache/github/rate-limit?resource=${encodeURIComponent(resource)}&v=1`,
    { method: 'GET' }
  );

const jsonResponse = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const readRateLimitMarker = async (
  resource: string
): Promise<RateLimitMarker | null> => {
  const cached = await cacheGet(
    rateLimitMarkerKey(resource),
    RATE_LIMIT_LOCK_MAX
  );
  if (!cached) return null;

  try {
    const data = (await cached.json()) as Partial<RateLimitMarker>;
    if (
      data?.__classy !== 'rate-limit' ||
      data.resource !== resource ||
      typeof data.until !== 'number'
    ) {
      return null;
    }
    if (data.until <= Date.now() / 1000) return null;

    return data as RateLimitMarker;
  } catch {
    return null;
  }
};

export const writeRateLimitMarker = async (
  resource: string,
  info: RateLimitInfo,
  status: number
): Promise<void> => {
  const now = Date.now() / 1000;
  const until = rateLimitLockUntil(info, now);
  const ttl = Math.max(1, Math.ceil(until - now));

  await cachePut(
    rateLimitMarkerKey(resource),
    jsonResponse({
      __classy: 'rate-limit',
      resource,
      until,
      resetAt: info.resetAt,
      retryAfter: info.retryAfter,
      status,
    }),
    ttl
  );
};
