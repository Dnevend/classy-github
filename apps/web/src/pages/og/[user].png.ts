import { siteOrigin } from "../../lib/site";
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ImageResponse } from 'workers-og';
import { USER_AGENT } from '../../lib/constants';
import { GitHubError, getUser, listRepos } from '../../lib/github';
import { parseThemeName } from '../../lib/theme';
import { paletteFor } from '../../lib/theme-palette';
import { loadConfigState } from '../../lib/config-loader';

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

const asciiName = (name: string | undefined, login: string) => {
  const value = name?.trim();
  if (!value) return login;
  return /^[\x20-\x7E]+$/.test(value) && value.length <= 28 ? value : login;
};

/**
 * 1200×630 社交卡片。
 *
 * 只用 ASCII（login / 统计 / 固定 tagline），避免把中文字体打进 Worker；
 * 字体走静态资源 ASSETS，颜色跟随主题。
 */
export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';

  if (!LOGIN.test(user)) {
    return new Response('Invalid GitHub login', { status: 400 });
  }

  let userinfo;

  try {
    userinfo = await getUser(user);
  } catch (error) {
    const status =
      error instanceof GitHubError && (error.status === 403 || error.status === 429)
        ? 503
        : 404;
    return new Response('GitHub unavailable', { status });
  }

  const theme = parseThemeName(url.searchParams.get('theme')) ?? 'mac';
  const palette = paletteFor(theme);
  const [config, repos, fonts, avatar] = await Promise.all([
    loadConfigState(user, { fresh: true })
      .then((state) => state.config)
      .catch(() => null),
    listRepos(user, { perPage: 100 }).catch(() => []),
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

  const stars = repos.reduce(
    (total, repo) => total + (repo.stargazers_count ?? 0),
    0
  );
  const display = asciiName(userinfo.name, userinfo.login);
  const avatarSrc = avatar
    ? `data:image/png;base64,${toBase64(avatar)}`
    : null;
  const host = new URL(siteOrigin(url)).host;

  const hasCover = Boolean(cover);
  const fg = hasCover ? '#ffffff' : palette.fg;
  const muted = hasCover ? 'rgba(255,255,255,0.78)' : palette.muted;
  const line = hasCover ? 'rgba(255,255,255,0.32)' : palette.border;
  const statBg = hasCover ? 'rgba(8,10,14,0.48)' : palette.bg;
  const statValue = hasCover ? '#ffffff' : palette.accent;
  const badgeBg = hasCover ? '#ffffff' : palette.accent;
  const badgeFg = hasCover ? '#111111' : palette.bg;
  const avatarBorder = hasCover ? 'rgba(255,255,255,0.9)' : palette.border;

  const stat = (value: number, label: string) => `
    <div style="display:flex;flex:1;flex-direction:column;gap:4px;padding:16px 22px;border:2px solid ${line};background:${statBg};min-width:0;">
      <div style="display:flex;font-size:44px;line-height:1;font-weight:700;color:${statValue};">${value}</div>
      <div style="display:flex;font-size:19px;letter-spacing:0.08em;text-transform:uppercase;color:${muted};">${label}</div>
    </div>`;

  const html = `
  <div style="position:relative;display:flex;flex-direction:column;width:1200px;height:630px;box-sizing:border-box;overflow:hidden;background-color:${palette.bg};background-image:${hasCover ? `url(${cover})` : 'none'};background-size:cover;background-position:center;color:${fg};border:12px solid ${palette.border};font-family:'ClassyOG',sans-serif;">
    <div style="position:relative;display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;padding:42px 52px;background:${hasCover ? 'linear-gradient(180deg,rgba(4,5,8,0.16) 0%,rgba(4,5,8,0.52) 44%,rgba(4,5,8,0.88) 100%)' : 'transparent'};">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${line};padding-bottom:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="display:flex;width:32px;height:32px;align-items:center;justify-content:center;background:${badgeBg};color:${badgeFg};font-size:17px;font-weight:700;">CG</div>
          <div style="display:flex;font-size:27px;font-weight:700;letter-spacing:0.04em;">ClassyGit</div>
        </div>
        <div style="display:flex;font-size:21px;letter-spacing:0.12em;text-transform:uppercase;color:${muted};">${theme.toUpperCase()} / 1984</div>
      </div>

      <div style="display:flex;align-items:flex-end;gap:28px;margin-top:30px;">
        ${
          avatarSrc
            ? `<img src="${avatarSrc}" width="128" height="128" style="width:128px;height:128px;border-radius:64px;border:4px solid ${avatarBorder};" />`
            : `<div style="display:flex;width:128px;height:128px;border-radius:64px;background:${badgeBg};"></div>`
        }
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0;padding-bottom:4px;">
          <div style="display:flex;font-size:56px;line-height:1.05;font-weight:700;overflow:hidden;white-space:nowrap;">${display}</div>
          <div style="display:flex;font-size:27px;color:${muted};">@${userinfo.login}</div>
        </div>
      </div>

      <div style="display:flex;gap:14px;margin-top:28px;">
        ${stat(userinfo.public_repos, 'repos')}
        ${stat(stars, 'stars')}
        ${stat(userinfo.public_gists, 'gists')}
        ${stat(userinfo.followers, 'followers')}
      </div>

      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;border-top:3px solid ${line};padding-top:18px;">
        <div style="display:flex;font-size:21px;color:${muted};">No deploy. No login. Just GitHub.</div>
        <div style="display:flex;font-size:19px;color:${muted};">${host}/${userinfo.login}</div>
      </div>
    </div>
  </div>`;

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
