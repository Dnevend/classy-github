/**
 * Worker 入口的轻量限流规则。
 *
 * 只覆盖容易被刷、且会放大成本或上游配额的路径：
 * - `?preview=1`、`/setup` 会跳过配置缓存或强制 fresh 读取
 * - `/random` 是公开的 302 入口
 * - `/api/*`、`/contrib/*` 会读写 KV / Durable Object 或打 GraphQL
 * - `/og/*`、`/card/*` 是昂贵的动态图片，`/badge/*` 是便宜的 SVG
 *
 * 规则和 binding 映射是纯函数/常量，方便在 node 里断言；真正调用
 * Rate Limiting binding 也在本文件，`worker.ts` 只负责接线。
 */
export type RateLimitRule = 'preview' | 'random' | 'api' | 'og' | 'badge';

export const rateLimitRuleFor = (url: URL): RateLimitRule | undefined => {
  if (url.searchParams.get('preview') === '1') return 'preview';

  const path = url.pathname;
  // setup 会以 fresh=true 读 config，每次都是一次真实上游请求。
  // claim 页只读用户资料，不进这个桶，避免和 setup / iframe 预览互相挤占。
  if (path === '/setup' || path === '/setup/') {
    return 'preview';
  }
  if (path === '/random' || path === '/random/') return 'random';
  if (
    path.startsWith('/api/hit/') ||
    path.startsWith('/api/ring/') ||
    path.startsWith('/contrib/')
  ) {
    return 'api';
  }
  if (path.startsWith('/badge/')) return 'badge';
  if (path.startsWith('/og/') || path.startsWith('/card/')) return 'og';

  return undefined;
};

/** 限流 key 里的客户端标识；拿不到时退回 `unknown`，至少能挡住单点刷量。 */
export const clientIp = (request: Request): string => {
  const direct = request.headers.get('cf-connecting-ip')?.trim();
  if (direct) return direct;

  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();

  return forwarded || 'unknown';
};

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type RateLimitEnv = Record<string, unknown>;

export const RATE_LIMIT_BINDINGS: Record<
  RateLimitRule,
  { perIp: string; global?: string }
> = {
  preview: { perIp: 'PREVIEW_LIMITER', global: 'PREVIEW_GLOBAL_LIMITER' },
  random: { perIp: 'RANDOM_LIMITER', global: 'RANDOM_GLOBAL_LIMITER' },
  api: { perIp: 'API_LIMITER', global: 'API_GLOBAL_LIMITER' },
  og: { perIp: 'ASSET_LIMITER', global: 'ASSET_GLOBAL_LIMITER' },
  badge: { perIp: 'BADGE_LIMITER' },
};

const limiterFor = (
  env: RateLimitEnv,
  binding: string
): RateLimiter | undefined => {
  const value = env[binding];
  if (
    value &&
    typeof value === 'object' &&
    'limit' in value &&
    typeof (value as RateLimiter).limit === 'function'
  ) {
    return value as RateLimiter;
  }

  return undefined;
};

/** 限流服务本身出错时放行，避免把站点整体打挂。 */
const isLimited = async (
  limiter: RateLimiter | undefined,
  key: string
): Promise<boolean> => {
  if (!limiter) return false;

  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    // 不要把 key 写进日志：key 可能包含客户端 IP，站点的隐私约定是不落 IP。
    console.warn('[classy] rate limit check failed:', error);
    return false;
  }
};

const tooManyRequests = () =>
  new Response('Too Many Requests', {
    status: 429,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '60',
    },
  });

export const enforceRateLimits = async (
  request: Request,
  env: RateLimitEnv
): Promise<Response | undefined> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;

  const rule = rateLimitRuleFor(new URL(request.url));
  if (!rule) return undefined;

  const bindings = RATE_LIMIT_BINDINGS[rule];
  const ip = clientIp(request);

  if (bindings.global) {
    const globalLimited = await isLimited(
      limiterFor(env, bindings.global),
      `${rule}:global`
    );
    if (globalLimited) return tooManyRequests();
  }

  const limited = await isLimited(
    limiterFor(env, bindings.perIp),
    `${rule}:${ip}`
  );

  return limited ? tooManyRequests() : undefined;
};
