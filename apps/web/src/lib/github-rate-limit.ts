import type { RateLimitInfo } from './github-error.ts';

/** 一次限流最多熔断 5 分钟，避免区域差异导致被旧标记挡住一小时。 */
export const RATE_LIMIT_LOCK_MAX = 300;

/**
 * 从 REST / GraphQL 响应里判断是不是限流。
 *
 * 不能把所有 403 都当限流：token 权限不足也会返回 403，但文案不该是
 * “配额用尽”。只有 429、remaining=0、retry-after 或明确的限流文案才算。
 */
export const parseRateLimit = (
  res: Response,
  text: string,
  options: { headers?: boolean } = {}
): RateLimitInfo | undefined => {
  const readHeaders = options.headers ?? true;
  const remaining = readHeaders
    ? Number(res.headers.get('x-ratelimit-remaining') ?? NaN)
    : NaN;
  const resetAt = readHeaders
    ? Number(res.headers.get('x-ratelimit-reset') ?? NaN)
    : NaN;
  const retryAfter = readHeaders
    ? Number(res.headers.get('retry-after') ?? NaN)
    : NaN;

  const limited =
    res.status === 429 ||
    remaining === 0 ||
    Number.isFinite(retryAfter) ||
    /rate limit|secondary rate|abuse/i.test(text);

  if (!limited) return undefined;

  return {
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    resetAt: Number.isFinite(resetAt) ? resetAt : undefined,
    retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
  };
};

/** 熔断到什么时候（epoch 秒）：至少 30 秒，最多 `RATE_LIMIT_LOCK_MAX`。 */
export const rateLimitLockUntil = (
  info: RateLimitInfo,
  now = Date.now() / 1000
): number => {
  const requestedUntil =
    info.retryAfter !== undefined
      ? now + info.retryAfter
      : info.resetAt !== undefined
        ? info.resetAt
        : now + 60;

  return Math.min(
    now + RATE_LIMIT_LOCK_MAX,
    Math.max(now + 30, requestedUntil)
  );
};
