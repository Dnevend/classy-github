import { siteOrigin } from "../../lib/site";
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ImageResponse } from 'workers-og';
import { USER_AGENT } from '../../lib/constants';
import { isNotFound, isRateLimited } from '../../lib/errors';
import { loadOgStats } from '../../lib/profile';
import { parseThemeName } from '../../lib/theme';
import { paletteFor } from '../../lib/theme-palette';
import { loadConfigState } from '../../lib/config-loader';
import { buildOgCardHtml } from '../../lib/og-card';
import {
  MAX_AVATAR_BYTES,
  MAX_COVER_BYTES,
  OG_FETCH_HEADER,
  OG_FETCH_TIMEOUT_MS,
  isBlockedSameOriginCoverPath,
  isOgFetchRequest,
  readBoundedBody,
} from '../../lib/og-cover';

export const prerender = false;

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

const fetchSignal = () => AbortSignal.timeout(OG_FETCH_TIMEOUT_MS);

interface AssetFetcher {
  fetch(input: Request): Promise<Response>;
}

const assetFetcher = (): AssetFetcher | undefined => {
  try {
    return (env as { ASSETS?: AssetFetcher }).ASSETS;
  } catch {
    return undefined;
  }
};

const fetchCover = async (
  coverUrl: string,
  publicOrigin: string,
  requestOrigin: string
) => {
  // cover 支持站内相对路径；按对外域名解析，保证本地路径和绝对 URL 都能取到。
  const target = new URL(coverUrl, publicOrigin);
  const assets = assetFetcher();
  const sameOrigin = target.origin === new URL(publicOrigin).origin;

  // 同源动态路由不能当封面：/og/... 会递归生成 OG，/api、/card 等也不是静态资源。
  if (sameOrigin && isBlockedSameOriginCoverPath(target.pathname)) return null;

  let response: Response | null = null;
  const requestHeaders = {
    'user-agent': USER_AGENT,
    [OG_FETCH_HEADER]: '1',
  };

  if (sameOrigin && assets) {
    try {
      // 静态资源按 pathname 取；host 用请求 origin，避免 Pages 代理后面
      // ASSETS 绑定收到另一个域名时匹配不到资源。
      const assetUrl = new URL(`${target.pathname}${target.search}`, requestOrigin);
      response = await assets.fetch(
        new Request(assetUrl, { headers: requestHeaders, signal: fetchSignal() })
      );
    } catch {
      response = null;
    }
  }

  if (!response || !response.ok) {
    response = await fetch(target.href, {
      headers: requestHeaders,
      signal: fetchSignal(),
    }).catch(() => null);
  }

  if (!response?.ok) return null;

  // 外链 302 回本站动态路由时，即使抓取头被中间层丢掉，也再按最终 URL 挡一次。
  try {
    const finalUrl = new URL(response.url);
    if (
      finalUrl.origin === new URL(publicOrigin).origin &&
      isBlockedSameOriginCoverPath(finalUrl.pathname)
    ) {
      return null;
    }
  } catch {
    // response.url 为空/非法时不阻塞正常封面
  }

  const type =
    response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  if (!type.startsWith('image/') || type === 'image/webp') return null;

  const body = await readBoundedBody(response, MAX_COVER_BYTES);
  if (!body) return null;

  return `data:${type};base64,${toBase64(body)}`;
};

let fontCache: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | undefined;

const loadFonts = (origin: string) => {
  fontCache ??= (async () => {
    const assets = assetFetcher();
    const load = async (file: string) => {
      if (assets) {
        const response = await assets.fetch(
          new Request(new URL(`/fonts/${file}`, origin), {
            signal: fetchSignal(),
          })
        );
        if (response.ok) return response.arrayBuffer();
      }

      // 理论上 ASSETS 一定存在；这里只作为本地异常场景的兜底。
      const response = await fetch(new URL(`/fonts/${file}`, origin), {
        headers: { 'user-agent': USER_AGENT },
        signal: fetchSignal(),
      });
      if (!response.ok) throw new Error(`font ${file} unavailable`);
      return response.arrayBuffer();
    };

    return {
      regular: await load('ms_sans_serif.woff'),
      bold: await load('ms_sans_serif_bold.woff'),
    };
  })();

  return fontCache;
};

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
};

/**
 * 1200×630 社交卡片。
 *
 * 只用 ASCII（login / 统计 / 固定 tagline），避免把中文字体打进 Worker；
 * 字体走静态资源 ASSETS，颜色跟随主题。
 */
export const GET: APIRoute = async ({ params, request, url, locals }) => {
  const user = params.user ?? '';

  if (isOgFetchRequest(request)) {
    return new Response('OG fetch recursion blocked', { status: 404 });
  }

  if (!LOGIN.test(user)) {
    return new Response('Invalid GitHub login', { status: 400 });
  }

  let stats;

  try {
    stats = await loadOgStats(user);
  } catch (error) {
    const status = isRateLimited(error) ? 503 : isNotFound(error) ? 404 : 502;
    return new Response('GitHub unavailable', { status });
  }

  if (!stats) {
    return new Response('GitHub user not found', { status: 404 });
  }

  const theme = parseThemeName(url.searchParams.get('theme')) ?? 'mac';
  const palette = paletteFor(theme);
  const publicOrigin = siteOrigin(url);
  const [config, fonts, avatar] = await Promise.all([
    loadConfigState(user, { memo: locals.configMemo })
      .then((state) => state.config)
      .catch(() => null),
    loadFonts(url.origin).catch(() => null),
    fetch(`https://github.com/${encodeURIComponent(user)}.png?size=160`, {
      headers: { 'user-agent': USER_AGENT },
      signal: fetchSignal(),
    })
      .then((response) =>
        response.ok ? readBoundedBody(response, MAX_AVATAR_BYTES) : null
      )
      .catch(() => null),
  ]);

  const coverUrl = config?.profile.cover ?? null;
  const cover = coverUrl
    ? await fetchCover(coverUrl, publicOrigin, url.origin).catch(() => null)
    : null;

  const avatarSrc = avatar
    ? `data:image/png;base64,${toBase64(avatar)}`
    : null;

  const html = buildOgCardHtml({
    login: stats.login,
    name: stats.name,
    publicRepos: stats.publicRepos,
    publicGists: stats.publicGists,
    followers: stats.followers,
    stars: stats.stars,
    theme,
    palette,
    host: new URL(publicOrigin).host,
    avatar: avatarSrc,
    cover,
  });

  const response = new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: fonts
      ? [
          { name: 'ClassyOG', data: fonts.regular, weight: 400, style: 'normal' },
          { name: 'ClassyOG', data: fonts.bold, weight: 700, style: 'normal' },
        ]
      : undefined,
    headers: {
      'cache-control': 'public, s-maxage=86400',
      'x-content-type-options': 'nosniff',
    },
  });

  return response;
};
