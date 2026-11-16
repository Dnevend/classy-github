import { defineMiddleware } from 'astro:middleware';
import { CACHED_AT_HEADER, cacheGet, cachePut, edgeCache } from './lib/edge-cache.ts';
import { loadConfigState } from './lib/config-loader.ts';
import type { ThemeName } from './lib/config.ts';
import { parseThemeName, THEME_COOKIE } from './lib/theme.ts';
import { resolveRequestTheme } from './lib/request-theme.ts';
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
  [/^\/[^/]+\/repo\/[^/]+\/.+$/, 300],
  [/^\/[^/]+\/repo\/[^/]+\/?$/, 300],
  [/^\/[^/]+\/?$/, 300],
];

/** 缓存版本号：改版时 +1 可以立即让旧 HTML 失效（不用等 TTL） */
const CACHE_VERSION = '26';

const ttlFor = (pathname: string) =>
  ROUTE_TTL.find(([pattern]) => pattern.test(pathname))?.[1];

/** 这些单段路径长得像用户名，但不是用户页，不能进主题/语言缓存 */
const SKIP_CACHE = /^\/(?:setup|random|robots\.txt|sitemap(?:\.xml|\/)|api(?:\/|$))/;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 站主默认主题的短期缓存。没有 classy-github 仓库的用户不能让 middleware
 * 每次 HTML 缓存命中都去打一次 GitHub API。
 */
const THEME_CACHE_TTL = 300;
const themeCacheKey = (login: string) =>
  new Request(`https://classy.cache/theme/${encodeURIComponent(login.toLowerCase())}?v=1`);

const loadConfigTheme = async (login: string, fresh: boolean): Promise<ThemeName> => {
  const key = themeCacheKey(login);

  if (!fresh) {
    const cached = await cacheGet(key, THEME_CACHE_TTL);
    if (cached) {
      const data = (await cached.json().catch(() => null)) as { theme?: unknown } | null;
      const theme = parseThemeName(typeof data?.theme === 'string' ? data.theme : null);
      if (theme) return theme;
    }
  }

  const state = await loadConfigState(login, { fresh });
  const theme = state.config.theme;

  // reliable=false 表示网络/限流，不能把 mac 当成“没有配置”缓存 5 分钟
  if (!fresh && state.reliable) {
    const response = new Response(JSON.stringify({ theme }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    await cachePut(key, response, THEME_CACHE_TTL);
  }

  return theme;
};

/**
 * 主题与语言都在这里解析并参与缓存键：
 *   theme  = ?theme= > cookie > 站主配置的默认主题 > mac
 *   locale = ?lang=  > cookie > auto（auto 由页面按用户配置决定）
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isPreview = url.searchParams.get('preview') === '1';

  const themeParam = url.searchParams.get('theme');
  const savedTheme = context.cookies.get(THEME_COOKIE);

  const { theme, persist: persistTheme } = await resolveRequestTheme({
    pathname: url.pathname,
    param: themeParam,
    cookie: savedTheme ? savedTheme.value : null,
    fresh: isPreview,
    loadConfigTheme,
  });

  const savedLocale = context.cookies.get(LOCALE_COOKIE);
  const locale = resolveLocale({
    param: url.searchParams.get('lang'),
    cookie: savedLocale ? savedLocale.value : null,
  });

  context.locals.theme = theme;
  context.locals.localeChoice = locale;
  context.locals.locale = locale === 'auto' ? DEFAULT_LOCALE : locale;

  // 预览不能改写访客的持久主题/语言，也不能命中 HTML 缓存
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

  // 预览必须反映刚保存的配置，不能命中 5 分钟的 HTML 缓存
  if (isPreview) {
    const response = await next();
    response.headers.set('cache-control', 'no-store');
    return response;
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
