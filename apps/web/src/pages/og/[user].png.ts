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

export const prerender = false;

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

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

const fetchCover = async (coverUrl: string, origin: string) => {
  const target = new URL(coverUrl);
  const assets = assetFetcher();
  const sameOrigin = target.origin === new URL(origin).origin;

  let response: Response | null = null;

  if (sameOrigin && assets) {
    try {
      response = await assets.fetch(new Request(target));
    } catch {
      response = null;
    }
  }

  if (!response || !response.ok) {
    response = await fetch(coverUrl, {
      headers: { 'user-agent': USER_AGENT },
    }).catch(() => null);
  }

  if (!response?.ok) return null;
  const type =
    response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  if (!type.startsWith('image/') || type === 'image/webp') return null;

  return `data:${type};base64,${toBase64(await response.arrayBuffer())}`;
};

let fontCache: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | undefined;

const loadFonts = (origin: string) => {
  fontCache ??= (async () => {
    const assets = assetFetcher();
    const load = async (file: string) => {
      if (assets) {
        const response = await assets.fetch(
          new Request(new URL(`/fonts/${file}`, origin))
        );
        if (response.ok) return response.arrayBuffer();
      }

      // 理论上 ASSETS 一定存在；这里只作为本地异常场景的兜底。
      const response = await fetch(new URL(`/fonts/${file}`, origin), {
        headers: { 'user-agent': USER_AGENT },
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
export const GET: APIRoute = async ({ params, url, locals }) => {
  const user = params.user ?? '';

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
  const [config, fonts, avatar] = await Promise.all([
    loadConfigState(user, { memo: locals.configMemo })
      .then((state) => state.config)
      .catch(() => null),
    loadFonts(url.origin).catch(() => null),
    fetch(`https://github.com/${encodeURIComponent(user)}.png?size=160`, {
      headers: { 'user-agent': USER_AGENT },
    })
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null),
  ]);

  const coverUrl = config?.profile.cover ?? null;
  const cover = coverUrl
    ? await fetchCover(coverUrl, url.origin).catch(() => null)
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
    host: new URL(siteOrigin(url)).host,
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
