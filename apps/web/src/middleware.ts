import { defineMiddleware } from 'astro:middleware';

/**
 * 按路由决定缓存时长。顺序敏感：先匹配更具体的路径。
 * 文章页（gist 详情）变化最少，缓存最久。
 */
const ROUTE_TTL: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/[^/]+\/gist\/[^/]+\/?$/, 3600],
  [/^\/[^/]+\/(?:repos|gists)\/?$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/?$/, 300],
  [/^\/[^/]+\/?$/, 300],
];

const ttlFor = (pathname: string) =>
  ROUTE_TTL.find(([pattern]) => pattern.test(pathname))?.[1];

/**
 * Workers 生成的响应不会被 Cloudflare 自动缓存，
 * 必须显式用 Cache API 存一份，否则每个请求都是冷渲染。
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  const ttl =
    context.request.method === 'GET' && url.pathname !== '/'
      ? ttlFor(url.pathname)
      : undefined;

  if (ttl === undefined) return next();

  const runtime = globalThis as unknown as { caches?: { default?: Cache } };
  const store = runtime.caches?.default;

  // 缓存键去掉 query，避免 ?utm_source=... 这类参数把缓存打散
  const key = new Request(`${url.origin}${url.pathname}`, { method: 'GET' });

  const hit = await store?.match(key);

  if (hit) {
    const response = new Response(hit.body, hit);
    response.headers.set('x-classy-cache', 'HIT');
    return response;
  }

  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('x-classy-cache', 'MISS');

  if (response.status === 200 && store) {
    out.headers.set(
      'cache-control',
      `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 12}`
    );

    const copy = out.clone();
    copy.headers.delete('x-classy-cache');

    // 缓存失败不影响响应
    await store.put(key, copy).catch(() => undefined);
  } else if (response.status !== 200) {
    out.headers.set('cache-control', 'no-store');
  }

  return out;
});
