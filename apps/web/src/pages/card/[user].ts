import type { APIRoute } from 'astro';
import { getUser, listRepos } from '../../lib/github';
import { isThemeName } from '../../lib/theme';
import { DEFAULT_LOCALE, isLocale, translate } from '../../lib/i18n';

export const prerender = false;

const PALETTE: Record<string, { bg: string; fg: string; muted: string; accent: string; border: string }> = {
  default: { bg: '#ffffff', fg: '#18181b', muted: '#71717a', accent: '#2563eb', border: '#e4e4e7' },
  nes: { bg: '#212529', fg: '#f8f9fa', muted: '#adb5bd', accent: '#92cc41', border: '#6c757d' },
  win95: { bg: '#c0c0c0', fg: '#000000', muted: '#404040', accent: '#000080', border: '#808080' },
  mac: { bg: '#ffffff', fg: '#000000', muted: '#4a4a4a', accent: '#000000', border: '#000000' },
  tui: { bg: '#0000a8', fg: '#ffffff', muted: '#a8a8a8', accent: '#00a800', border: '#a8a8a8' },
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);

export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';
  const themeParam = url.searchParams.get('theme');
  const theme = isThemeName(themeParam) ? themeParam : 'default';
  const localeParam = url.searchParams.get('lang');
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const colors = PALETTE[theme] ?? PALETTE.default;

  let userinfo;
  try {
    userinfo = await getUser(user);
  } catch {
    return new Response('', { status: 404 });
  }

  const repos = await listRepos(user, { perPage: 100 }).catch(() => []);
  const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0);
  const languages = new Set(repos.map((repo) => repo.language).filter(Boolean)).size;

  const display = escapeXml((userinfo.name || userinfo.login).slice(0, 24));
  const handle = escapeXml(`@${userinfo.login}`);
  const label = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const cells = [
    { value: userinfo.public_repos, label: label('stats.repos') },
    { value: stars, label: label('stats.stars') },
    { value: userinfo.public_gists, label: label('stats.gists') },
    { value: languages, label: label('stats.languages') },
  ];

  const cellWidth = 78;
  const startX = 16;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="132" viewBox="0 0 320 132" role="img" aria-label="${display}">
  <rect width="320" height="132" rx="12" fill="${colors.bg}" stroke="${colors.border}"/>
  <text x="${startX}" y="34" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="700" fill="${colors.fg}">${display}</text>
  <text x="${startX}" y="52" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="${colors.muted}">${handle}</text>
  <line x1="${startX}" y1="64" x2="304" y2="64" stroke="${colors.border}" stroke-width="1" opacity="0.5"/>
  ${cells
    .map(
      (cell, index) => `<g transform="translate(${startX + index * cellWidth}, 0)">
    <text x="0" y="92" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="${colors.accent}">${cell.value}</text>
    <text x="0" y="110" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10" fill="${colors.muted}">${escapeXml(cell.label)}</text>
  </g>`
    )
    .join('\n  ')}
</svg>`;

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=600',
    },
  });
};
