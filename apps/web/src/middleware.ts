import { defineMiddleware } from 'astro:middleware';
import {
  CACHED_AT_HEADER,
  cacheGet,
  cacheGetStale,
  cachePut,
  edgeCache,
} from './lib/edge-cache.ts';
import { loadConfigState, type ConfigState } from './lib/config-loader.ts';
import {
  serveStaleHtml,
  serveStaleWhileRevalidate,
  previousCacheKey,
  STALE_HTML_TTL,
  SWR_STALE_TTL,
} from './lib/stale-html.ts';
import { isPreviewRequest } from './lib/preview.ts';
import { siteOrigin } from './lib/site.ts';
import { normalizeCacheParams } from './lib/request-params.ts';
import { shouldSkipCache, ttlFor } from './lib/cache-policy.ts';
import { DEFAULT_CONFIG, type ThemeName } from './lib/config.ts';
import { loadProfile } from './lib/profile.ts';
import { singleFlight } from './lib/single-flight.ts';
import { userFromPath } from './lib/user-route.ts';
import { parseThemeName, THEME_COOKIE } from './lib/theme.ts';
import { resolveRequestTheme } from './lib/request-theme.ts';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  parseAcceptLanguage,
  resolveLocale,
} from './lib/i18n.ts';

/** 缓存版本号：改版时 +1 可以立即让旧 HTML 失效（不用等 TTL） */
const CACHE_VERSION = '44';

/** 仓库文件页不参与索引；meta 之外再加一层响应头，覆盖 302 和非 HTML。 */
const isRepoPath = (pathname: string) =>
  /^\/[^/]+\/repo(?:\/|$)/.test(pathname);

/** 只在 HTML 页面写语言 cookie，避免给 API / 图片 / sitemap 加 Set-Cookie。 */
const isDocumentPath = (pathname: string) =>
  !/^\/(?:api|og|card|contrib|sitemap|robots\.txt)(?:\/|$|\.[a-z]+$)/i.test(
    pathname
  ) && !/^\/badge\/[^/]+\.svg$/i.test(pathname);

/**
 * v43 → v44 迁移期：新 key 没有缓存时，旧 key 的 stale HTML 仍然比 503 好。
 * 有效期就是 stale 的 24 小时，过了这个窗口删掉即可。
 */
const PREVIOUS_CACHE_VERSIONS = ['43', '42', '41', '40'];

const serveStaleAnyVersion = async (
  key: Request,
  status: number
): Promise<Response | undefined> => {
  const current = await serveStaleHtml(key, status);
  if (current) return current;

  for (const version of PREVIOUS_CACHE_VERSIONS) {
    const old = await serveStaleHtml(previousCacheKey(key, version), status);
    if (old) return old;
  }

  return undefined;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 站主默认主题的缓存。没有 classy-github 仓库的用户不能让 middleware
 * 每次 HTML 缓存命中都去打一次 GitHub API。
 *
 * 30 分钟新鲜期 + 24 小时 stale：过期后先返回旧主题、后台刷新，
 * 这样 stale HTML 之前不必再等一次 Config GraphQL。
 *
 * 有意的取舍：站主改 theme 后，无 cookie 访客最长 30 分钟仍看到旧主题；
 * `?theme=` / `?preview=1` 会绕过缓存，站主可以立即验证新主题。
 */
const THEME_CACHE_TTL = 60 * 30;
const THEME_STALE_TTL = 60 * 60 * 24;
const themeCacheKey = (login: string) =>
  new Request(`https://classy.cache/theme/${encodeURIComponent(login.toLowerCase())}?v=1`);

const themeResponse = (theme: ThemeName) =>
  new Response(JSON.stringify({ theme }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const parseThemePayload = async (response: Response): Promise<ThemeName | null> => {
  const data = (await response.json().catch(() => null)) as { theme?: unknown } | null;
  return parseThemeName(typeof data?.theme === 'string' ? data.theme : null);
};

const loadConfigTheme = async (
  login: string,
  fresh: boolean,
  memo?: Map<string, Promise<ConfigState>>,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<ThemeName> => {
  const key = themeCacheKey(login);

  if (!fresh) {
    const cached = await cacheGet(key, THEME_CACHE_TTL);
    if (cached) {
      const theme = await parseThemePayload(cached);
      if (theme) return theme;
    }

    // 过期主题先顶上；后台刷新失败时保持旧值，不影响访客。
    const stale = await cacheGetStale(key, THEME_STALE_TTL);
    if (stale) {
      const theme = await parseThemePayload(stale);
      if (theme) {
        if (waitUntil) {
          waitUntil(
            singleFlight(`theme:${key.url}`, async () => {
              try {
                // 用请求级 memo：如果同一请求随后要渲染页面，页面直接复用
                // 这次回源，不会再打一次 Config GraphQL。
                const state = await loadConfigState(login, { fresh: false, memo });
                if (state.reliable) {
                  await cachePut(
                    key,
                    themeResponse(state.config.theme),
                    THEME_CACHE_TTL,
                    THEME_STALE_TTL
                  );
                }
              } catch (error) {
                console.warn(`[classy] 主题缓存后台刷新失败 (${login}):`, error);
              }
            })
          );
          return theme;
        }
        // 没有 waitUntil（本地 dev 等）时不能把 stale 主题当成最新值无限
        // 返回；继续走下面的同步 loadConfigState。
      }
    }
  }

  const state = await loadConfigState(login, { fresh, memo });
  const theme = state.config.theme;

  // reliable=false 表示网络/限流，不能把 mac 当成“没有配置”缓存
  if (!fresh && state.reliable) {
    await cachePut(key, themeResponse(theme), THEME_CACHE_TTL, THEME_STALE_TTL);
  }

  return theme;
};

/**
 * 主题与语言都在这里解析并参与缓存键：
 *   theme  = ?theme= > cookie > 站主配置的默认主题 > mac
 *   locale = ?lang=  > cookie > Accept-Language > auto
 *
 * auto 只表示「没有任何语言信号」：独立页面回退默认语言，
 * 用户页回退站主配置里的 language。
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isPreview = isPreviewRequest(
    context.request,
    url,
    siteOrigin(url)
  );

  const cfContext = context.locals.cfContext;
  const waitUntil = cfContext
    ? (promise: Promise<unknown>) => cfContext.waitUntil(promise)
    : undefined;

  // 请求级配置 memo：middleware 读过 config 后，页面直接复用同一个 Promise。
  const configMemo = new Map<string, Promise<ConfigState>>();
  context.locals.configMemo = configMemo;

  const themeParam = url.searchParams.get('theme');
  const savedTheme = context.cookies.get(THEME_COOKIE);
  const explicitTheme = Boolean(
    parseThemeName(themeParam) ||
      parseThemeName(savedTheme ? savedTheme.value : null)
  );

  // 用户主页的数据预取：theme 需要先读 config 才能确定，而 profile 不依赖
  // config（数量按默认值取，页面不够再补一次）。
  //
  // 预取只放在两个位置：
  // 1) 真冷路径（无显式主题、主题缓存也冷）：config 要回源，提前拉 profile
  //    才能和它并行；
  // 2) HTML 缓存未命中之后、next() 之前：和页面里的 config/profile 读取并行，
  //    同时避免普通 HIT 为了预取白打一次 GitHub。
  const isProfilePath = /^\/[^/]+\/?$/.test(url.pathname);
  const profileLogin = isProfilePath ? userFromPath(url.pathname) : null;
  const canPrefetchProfile =
    profileLogin !== null && !isPreview && context.request.method === 'GET';

  const startProfilePrefetch = () => {
    if (!canPrefetchProfile || !profileLogin) return;
    if (context.locals.profilePrefetch) return;

    const repoCount = DEFAULT_CONFIG.profile.repos.showCount;
    const gistCount = DEFAULT_CONFIG.profile.gists.showCount;
    const promise = loadProfile(profileLogin, { repoCount, gistCount });
    // 页面可能因为提前 404/错误而没有消费这个 Promise；先挂一个空 catch，
    // 避免 unhandled rejection；原始 Promise 仍然会把结果/错误交给页面。
    promise.catch(() => undefined);
    context.locals.profilePrefetch = {
      login: profileLogin.toLowerCase(),
      repoCount,
      gistCount,
      promise,
    };
  };

  if (canPrefetchProfile && profileLogin && !explicitTheme) {
    // 只有「新鲜和 stale 主题缓存都没有」才算是真冷：此时 config 必须回源，
    // 提前拉 profile 才能和它并行。主题缓存只是过期（stale 仍在）时，
    // resolveRequestTheme 会先返回旧主题；若 HTML 命中就不该再白打 GitHub，
    // 若 HTML 未命中则由下面的 startProfilePrefetch() 在 next() 前补上。
    const key = themeCacheKey(profileLogin);
    const [freshTheme, staleTheme] = await Promise.all([
      cacheGet(key, THEME_CACHE_TTL),
      cacheGetStale(key, THEME_STALE_TTL),
    ]);
    if (!freshTheme && !staleTheme) startProfilePrefetch();
  }

  const { theme, persist: persistTheme } = await resolveRequestTheme({
    pathname: url.pathname,
    param: themeParam,
    cookie: savedTheme ? savedTheme.value : null,
    fresh: isPreview,
    loadConfigTheme: (login, fresh) =>
      loadConfigTheme(login, fresh, configMemo, waitUntil),
  });

  const savedLocale = context.cookies.get(LOCALE_COOKIE);
  const locale = resolveLocale({
    param: url.searchParams.get('lang'),
    cookie: savedLocale ? savedLocale.value : null,
  });
  const hasExplicitParam = isLocale(url.searchParams.get('lang'));
  const hasValidCookie = isLocale(savedLocale?.value);
  const detectedLocale = parseAcceptLanguage(
    context.request.headers.get('accept-language')
  );
  // ?lang= > cookie > Accept-Language > auto（没有任何语言信号）
  const localeChoice =
    locale !== 'auto' ? locale : (detectedLocale ?? 'auto');

  context.locals.theme = theme;
  context.locals.localeChoice = localeChoice;
  context.locals.locale =
    localeChoice === 'auto' ? DEFAULT_LOCALE : localeChoice;

  // 预览不能改写访客的持久主题/语言，也不能命中 HTML 缓存
  if (persistTheme && !isPreview) {
    context.cookies.set(THEME_COOKIE, theme, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: url.protocol === 'https:',
    });
  }

  // 第一次访问按 Accept-Language 落 cookie；显式 ?lang= 始终覆盖。
  // 已有 cookie 时不再被浏览器语言改写，尊重访客的选择。
  if (
    !isPreview &&
    localeChoice !== 'auto' &&
    (hasExplicitParam || !hasValidCookie) &&
    isDocumentPath(url.pathname)
  ) {
    context.cookies.set(LOCALE_COOKIE, localeChoice, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: url.protocol === 'https:',
    });
  }

  // 预览必须反映刚保存的配置，不能命中 5 分钟的 HTML 缓存
  if (isPreview) {
    const response = await next();
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    return response;
  }

  // 分页 / 标签筛选都要进缓存键，否则不同筛选会互相污染。
  // 非法值由 request-params 归一到安全值：不生成额外 key，也不绕过缓存，
  // 避免 ?tag=超长字符串 / ?page=999999 变成免费的 cache miss 放大器。
  const { page: pageParam, tag: tagParam } = normalizeCacheParams(
    url.pathname,
    url.searchParams
  );

  const ttl =
    context.request.method === 'GET' && !shouldSkipCache(url.pathname)
      ? ttlFor(url.pathname)
      : undefined;

  if (ttl === undefined) return next();

  // 语言现在统一由 middleware 解析；缓存键必须带上最终语言，
  // 否则中文访客会把中文页缓存给英文访客。
  // localeChoice === 'auto' 只发生在完全没有语言信号时，用户页会回退站主配置。
  const cacheLocale = localeChoice;

  const page = pageParam.value;
  const tag = tagParam.value;
  const key = new Request(
    `${url.origin}${url.pathname}?theme=${theme}&lang=${cacheLocale}&v=${CACHE_VERSION}${page && page > 1 ? `&page=${page}` : ''}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`,
    { method: 'GET' }
  );

  // 仅开发环境的故障注入：绕过 fresh cache 后强制上游 503，
  // 用来验证 stale HTML 兜底。生产构建里 import.meta.env.DEV 为 false。
  const testHeaders = import.meta.env.DEV
    ? context.request.headers
    : undefined;
  const forceFail = testHeaders?.get('x-classy-test-fail') === '1';
  const bypassFresh = testHeaders?.get('x-classy-test-bypass-cache') === '1';

  const hit = bypassFresh ? undefined : await cacheGet(key, ttl);

  if (hit) {
    const response = new Response(hit.body, hit);
    response.headers.delete(CACHED_AT_HEADER);
    // 缓存副本的 s-maxage 是给 SWR/stale 用的存储窗口，不能原样发给客户端。
    response.headers.set('cache-control', `public, s-maxage=${ttl}`);
    response.headers.set('x-classy-cache', 'HIT');
    if (isRepoPath(url.pathname)) {
      response.headers.set('x-robots-tag', 'noindex, nofollow');
    }
    return response;
  }

  // fresh HTML 未命中：这时才启动预取。HIT 在上面已经返回，不会为了
  // 缓存命中额外打 GitHub；预取在 next() 之前启动，和页面读取并行。
  if (!forceFail) startProfilePrefetch();

  // 刚过期、但还在 SWR 窗口内的 HTML：先返回旧页面，后台重新渲染。
  // 没有 waitUntil（astro dev 等）时不做 SWR，保持原来的同步行为。
  if (!bypassFresh && !forceFail && waitUntil) {
    const stale = await serveStaleWhileRevalidate({
      key,
      staleTtl: SWR_STALE_TTL,
      ttl,
      revalidate: () => next(),
      waitUntil,
    });

    if (stale) {
      if (isRepoPath(url.pathname)) {
        stale.headers.set('x-robots-tag', 'noindex, nofollow');
      }
      return stale;
    }
  }

  let response: Response;
  if (forceFail) {
    response = new Response('forced upstream failure', { status: 503 });
  } else {
    try {
      response = await next();
    } catch (error) {
      // 页面渲染直接抛错时也走旧 HTML；比把异常抛给访客好。
      const fallback = await serveStaleAnyVersion(key, 503);
      if (fallback) {
        if (isRepoPath(url.pathname)) {
          fallback.headers.set('x-robots-tag', 'noindex, nofollow');
        }
        console.warn(
          `[classy] serving stale HTML ${url.pathname} after render exception`
        );
        return fallback;
      }
      throw error;
    }
  }

  const fallback = await serveStaleAnyVersion(key, response.status);
  if (fallback) {
    if (isRepoPath(url.pathname)) {
      fallback.headers.set('x-robots-tag', 'noindex, nofollow');
    }
    console.warn(
      `[classy] serving stale HTML ${url.pathname} (upstream ${response.status})`
    );
    return fallback;
  }

  const out = new Response(response.body, response);
  out.headers.set('x-classy-cache', 'MISS');
  if (isRepoPath(url.pathname)) {
    out.headers.set('x-robots-tag', 'noindex, nofollow');
  }

  // 200 是正常页面；302 用于未认领用户的仓库深路径跳转。
  // 两者都进边缘缓存：前者避免重复渲染，后者避免每次深路径都执行 Worker。
  const shouldCache =
    (response.status === 200 || response.status === 302) && Boolean(edgeCache());

  if (shouldCache) {
    out.headers.set('cache-control', `public, s-maxage=${ttl}`);

    // Set-Cookie 不能进缓存，否则会把「某人选的主题/语言」发给所有人
    const setCookie = out.headers.get('set-cookie');
    out.headers.delete('set-cookie');

    // 逻辑 TTL 仍然是 ttl（5 分钟），但缓存副本要活到 stale 兜底窗口结束。
    const cacheWrite = cachePut(key, out, ttl, STALE_HTML_TTL);
    if (waitUntil) waitUntil(cacheWrite);
    else await cacheWrite;

    if (setCookie) out.headers.set('set-cookie', setCookie);
  } else {
    out.headers.set('cache-control', 'no-store');
  }

  return out;
});
