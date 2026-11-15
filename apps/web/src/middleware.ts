import { defineMiddleware } from 'astro:middleware';
import { CACHED_AT_HEADER, cacheGet, cachePut, edgeCache } from './lib/edge-cache.ts';
import { THEME_COOKIE, resolveThemeChoice } from './lib/theme.ts';

/**
 * 按路由决定缓存时长。顺序敏感：先匹配更具体的路径。
 * 文章页（gist 详情）变化最少，缓存最久。
 */
const ROUTE_TTL: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/$/, 3600],
  [/^\/[^/]+\/gist\/[^/]+\/?$/, 3600],
  [/^\/[^/]+\/(?:repos|gists)\/?$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/?$/, 300],
  [/^\/[^/]+\/?$/, 300],
];

const ttlFor = (pathname: string) =>
  ROUTE_TTL.find(([pattern]) => pattern.test(pathname))?.[1];

const THEME_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Workers 生成的响应不会被 Cloudflare 自动缓存，
 * 必须显式用 Cache API 存一份，否则每个请求都是冷渲染。
 *
 * 主题在这里解析：`?theme=` > cookie > default。
 * 缓存键必须带解析后的主题，否则 A 的 nes 页面会被发给 B。
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  const saved = context.cookies.get(THEME_COOKIE);
  const { theme, persist } = resolveThemeChoice({
    param: url.searchParams.get('theme'),
    cookie: saved ? saved.value : null,
  });

  // 页面通过 locals 拿主题，不再各自解析一遍 URL
  context.locals.theme = theme;

  if (persist) {
    context.cookies.set(THEME_COOKIE, theme, {
      path: '/',
      maxAge: THEME_MAX_AGE,
      sameSite: 'lax',
    });
  }

  const ttl =
    context.request.method === 'GET' ? ttlFor(url.pathname) : undefined;

  if (ttl === undefined) return next();

  const key = new Request(`${url.origin}${url.pathname}?theme=${theme}`, {
    method: 'GET',
  });

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

    // Set-Cookie 不能进缓存，否则会把「某人选的主题」发给所有人
    const setCookie = out.headers.get('set-cookie');
    out.headers.delete('set-cookie');

    await cachePut(key, out, ttl);

    if (setCookie) out.headers.set('set-cookie', setCookie);
  } else if (response.status !== 200) {
    out.headers.set('cache-control', 'no-store');
  }

  return out;
});
