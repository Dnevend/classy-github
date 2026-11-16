import { defineMiddleware } from 'astro:middleware';
import { CACHED_AT_HEADER, cacheGet, cachePut, edgeCache } from './lib/edge-cache.ts';
import { THEME_COOKIE, resolveThemeChoice } from './lib/theme.ts';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  resolveLocale,
} from './lib/i18n.ts';

/**
 * 按路由决定缓存时长。顺序敏感：先匹配更具体的路径。
 */
const ROUTE_TTL: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/$/, 3600],
  [/^\/webring\/?$/, 300],
  [/^\/badge\/[^/]+\.svg$/, 86400],
  [/^\/og\/[^/]+\.png$/, 86400],
  [/^\/[^/]+\/gist\/[^/]+\/?$/, 3600],
  [/^\/[^/]+\/rss\.xml$/, 3600],
  [/^\/[^/]+\/archive\/?$/, 300],
  [/^\/[^/]+\/guestbook\/?$/, 300],
  [/^\/[^/]+\/(?:repos|gists)\/?$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/?$/, 300],
  [/^\/[^/]+\/?$/, 300],
];

/** 缓存版本号：改版时 +1 可以立即让旧 HTML 失效（不用等 TTL） */
const CACHE_VERSION = '14';

const ttlFor = (pathname: string) =>
  ROUTE_TTL.find(([pattern]) => pattern.test(pathname))?.[1];

/** 这些单段路径长得像用户名，但不是用户页，不能进主题/语言缓存 */
const SKIP_CACHE = /^\/(?:setup|random|robots\.txt|sitemap(?:\.xml|\/)|api(?:\/|$))/;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 主题与语言都在这里解析并参与缓存键：
 *   theme  = ?theme= > cookie > default
 *   locale = ?lang=  > cookie > auto（auto 由页面按用户配置决定）
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  const savedTheme = context.cookies.get(THEME_COOKIE);
  const { theme, persist: persistTheme } = resolveThemeChoice({
    param: url.searchParams.get('theme'),
    cookie: savedTheme ? savedTheme.value : null,
  });

  const savedLocale = context.cookies.get(LOCALE_COOKIE);
  const locale = resolveLocale({
    param: url.searchParams.get('lang'),
    cookie: savedLocale ? savedLocale.value : null,
  });

  context.locals.theme = theme;
  context.locals.localeChoice = locale;
  context.locals.locale = locale === 'auto' ? DEFAULT_LOCALE : locale;

  // 配置生成器的 iframe 预览不应该改写访客的持久主题
  const isPreview = url.searchParams.get('preview') === '1';

  if (persistTheme && !isPreview) {
    context.cookies.set(THEME_COOKIE, theme, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }

  if (locale !== 'auto' && !isPreview) {
    context.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }

  const ttl =
    context.request.method === 'GET' && !SKIP_CACHE.test(url.pathname)
      ? ttlFor(url.pathname)
      : undefined;

  if (ttl === undefined) return next();

  // 首页 / 网站环没有站主配置，按浏览器语言渲染；缓存键必须带上它，
  // 否则中文访客会把中文页缓存给英文访客。
  // 用户页的 auto 由站主配置决定，不按访客浏览器语言分片。
  const standaloneLocale = url.pathname === '/' || url.pathname === '/webring';
  const cacheLocale =
    standaloneLocale && locale === 'auto'
      ? localeFromAcceptLanguage(context.request.headers.get('accept-language'))
      : locale;

  // 分页 / 标签筛选都要进缓存键，否则不同筛选会互相污染
  const page = url.searchParams.get('page');
  const tag = url.searchParams.get('tag')?.trim();
  const key = new Request(
    `${url.origin}${url.pathname}?theme=${theme}&lang=${cacheLocale}&v=${CACHE_VERSION}${page ? `&page=${page}` : ''}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`,
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

    // Set-Cookie 不能进缓存，否则会把「某人选的主题/语言」发给所有人
    const setCookie = out.headers.get('set-cookie');
    out.headers.delete('set-cookie');

    await cachePut(key, out, ttl);

    if (setCookie) out.headers.set('set-cookie', setCookie);
  } else if (response.status !== 200) {
    out.headers.set('cache-control', 'no-store');
  }

  return out;
});
