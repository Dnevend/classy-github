import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ImageResponse } from 'workers-og';
import { USER_AGENT } from '../../lib/constants';
import { GitHubError, getUser, listRepos } from '../../lib/github';
import { parseThemeName } from '../../lib/theme';
import { paletteFor } from '../../lib/theme-palette';

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
  const [repos, fonts, avatar] = await Promise.all([
    listRepos(user, { perPage: 100 }).catch(() => []),
    loadFonts(url.origin).catch(() => null),
    fetch(`https://github.com/${encodeURIComponent(user)}.png?size=160`, {
      headers: { 'user-agent': USER_AGENT },
    })
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null),
  ]);

  const stars = repos.reduce(
    (total, repo) => total + (repo.stargazers_count ?? 0),
    0
  );
  const display = asciiName(userinfo.name, userinfo.login);
  const avatarSrc = avatar
    ? `data:image/png;base64,${toBase64(avatar)}`
    : null;
  const host = new URL(url.origin).host;

  const stat = (value: number, label: string) => `
    <div style="display:flex;flex-direction:column;gap:4px;padding:18px 26px;border:2px solid ${palette.border};background:${palette.bg};min-width:170px;">
      <div style="display:flex;font-size:46px;line-height:1;font-weight:700;color:${palette.accent};">${value}</div>
      <div style="display:flex;font-size:20px;letter-spacing:0.08em;text-transform:uppercase;color:${palette.muted};">${label}</div>
    </div>`;

  const html = `
  <div style="display:flex;flex-direction:column;width:1200px;height:630px;box-sizing:border-box;padding:54px 64px;background:${palette.bg};color:${palette.fg};border:12px solid ${palette.border};font-family:'ClassyOG',sans-serif;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${palette.border};padding-bottom:22px;">
      <div style="display:flex;align-items:center;gap:18px;">
        <div style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;background:${palette.accent};color:${palette.bg};font-size:18px;font-weight:700;">CG</div>
        <div style="display:flex;font-size:28px;font-weight:700;letter-spacing:0.04em;">ClassyGit</div>
      </div>
      <div style="display:flex;font-size:22px;letter-spacing:0.12em;text-transform:uppercase;color:${palette.muted};">${theme.toUpperCase()} / 1984</div>
    </div>

    <div style="display:flex;align-items:center;gap:30px;margin-top:34px;">
      ${
        avatarSrc
          ? `<img src="${avatarSrc}" width="132" height="132" style="width:132px;height:132px;border-radius:66px;border:4px solid ${palette.border};" />`
          : `<div style="display:flex;width:132px;height:132px;border-radius:66px;background:${palette.accent};"></div>`
      }
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <div style="display:flex;font-size:58px;line-height:1.05;font-weight:700;overflow:hidden;white-space:nowrap;">${display}</div>
        <div style="display:flex;font-size:28px;color:${palette.muted};">@${userinfo.login}</div>
      </div>
    </div>

    <div style="display:flex;gap:16px;margin-top:32px;">
      ${stat(userinfo.public_repos, 'repos')}
      ${stat(stars, 'stars')}
      ${stat(userinfo.public_gists, 'gists')}
      ${stat(userinfo.followers, 'followers')}
    </div>

    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;border-top:3px solid ${palette.border};padding-top:20px;">
      <div style="display:flex;font-size:22px;color:${palette.muted};">No deploy. No login. Just GitHub.</div>
      <div style="display:flex;font-size:20px;color:${palette.muted};">${host}/${userinfo.login}</div>
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
