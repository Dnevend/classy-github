import { clientIp, type RateLimiter } from '../rate-limit.ts';

const tooManyRequests = (): Response =>
  new Response('Too Many Requests', {
    status: 429,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '60',
    },
  });

const limited = async (
  limiter: RateLimiter | undefined,
  key: string
): Promise<boolean> => {
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    console.warn('[classy nft] rate limit check failed:', error);
    return false;
  }
};

/**
 * Dedicated NFT bucket. Unlike the site-wide helper, this also applies to POST
 * so voucher/prepare calls cannot be scripted freely.
 */
export const enforceNftRateLimit = async (
  request: Request,
  env: Record<string, unknown>
): Promise<Response | undefined> => {
  const globalLimiter = env.NFT_GLOBAL_LIMITER as RateLimiter | undefined;
  const perIpLimiter = env.NFT_LIMITER as RateLimiter | undefined;

  if (await limited(globalLimiter, 'nft:global')) {
    return tooManyRequests();
  }
  if (await limited(perIpLimiter, `nft:${clientIp(request)}`)) {
    return tooManyRequests();
  }
  return undefined;
};
