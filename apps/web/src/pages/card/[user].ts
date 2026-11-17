import type { APIRoute } from 'astro';
import { isNotFound, isRateLimited } from '../../lib/errors';
import { loadOgStats } from '../../lib/profile';
import { paletteFor } from '../../lib/theme-palette';
import { DEFAULT_LOCALE, isLocale, translate } from '../../lib/i18n';

export const prerender = false;

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char);

export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';
  const localeParam = url.searchParams.get('lang');
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const colors = paletteFor(url.searchParams.get('theme'));

  let stats;

  try {
    stats = await loadOgStats(user);
  } catch (error) {
    const status = isRateLimited(error) ? 503 : isNotFound(error) ? 404 : 502;
    return new Response('', { status });
  }

  if (!stats) return new Response('', { status: 404 });

  const display = escapeXml((stats.name || stats.login).slice(0, 24));
  const handle = escapeXml(`@${stats.login}`);
  const label = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const cells = [
    { value: stats.publicRepos, label: label('stats.repos') },
    { value: stats.stars, label: label('stats.stars') },
    { value: stats.publicGists, label: label('stats.gists') },
    { value: stats.languages, label: label('stats.languages') },
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
