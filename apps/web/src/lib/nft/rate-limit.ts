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

export type NftRateLimitMode = 'read' | 'write';

const BINDINGS: Record<
  NftRateLimitMode,
  { perIp: string; global: string }
> = {
  read: { perIp: 'NFT_LIMITER', global: 'NFT_GLOBAL_LIMITER' },
  write: { perIp: 'NFT_WRITE_LIMITER', global: 'NFT_WRITE_GLOBAL_LIMITER' },
};

/**
 * Two NFT buckets:
 * - write: OAuth / prepare / voucher / logout (protects the GitHub token)
 * - read:  stats / session / confirm polling (must tolerate a claim flow)
 */
export const enforceNftRateLimit = async (
  request: Request,
  env: Record<string, unknown>,
  mode: NftRateLimitMode = 'read'
): Promise<Response | undefined> => {
  const bindings = BINDINGS[mode];
  const globalLimiter = env[bindings.global] as RateLimiter | undefined;
  const perIpLimiter = env[bindings.perIp] as RateLimiter | undefined;

  if (await limited(globalLimiter, `nft:${mode}:global`)) {
    return tooManyRequests();
  }
  if (await limited(perIpLimiter, `nft:${mode}:${clientIp(request)}`)) {
    return tooManyRequests();
  }
  return undefined;
};
