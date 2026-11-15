import { defineMiddleware } from 'astro:middleware';
import { CACHED_AT_HEADER, cacheGet, cachePut, edgeCache } from './lib/edge-cache.ts';

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

  // 缓存键：丢掉无关 query（?utm_*），但保留 ?theme= —— 主题是服务端渲染的维度，
  // 不进键的话 default 的 HTML 会被当成 nes 的返回出去。
  const theme = url.searchParams.get('theme');
  const key = new Request(
    `${url.origin}${url.pathname}${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`,
    { method: 'GET' }
  );

  const hit = await cacheGet(key, ttl);

  if (hit) {
    const response = new Response(hit.body, hit);
    response.headers.delete(CACHED_AT_HEADER);
    response.headers.set('x-classy-cache', 'HIT');
    return response;
  }

  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('x-classy-cache', 'MISS');

  if (response.status === 200 && edgeCache()) {
    out.headers.set('cache-control', `public, s-maxage=${ttl}`);
    await cachePut(key, out, ttl);
  } else if (response.status !== 200) {
    out.headers.set('cache-control', 'no-store');
  }

  return out;
});
