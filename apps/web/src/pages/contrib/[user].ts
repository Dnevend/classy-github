import type { APIRoute } from 'astro';
import { GITHUB_TOKEN } from 'astro:env/server';
import { USER_AGENT } from '../../lib/constants';
import { cacheGet, cachePut } from '../../lib/edge-cache';
import { isThemeName } from '../../lib/theme';

export const prerender = false;

interface CalendarResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    };
  };
}

/** 主题相关的五档配色 */
const SCALE: Record<string, string[]> = {
  default: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
  mac: ['#f0f0f0', '#d0d0d0', '#a0a0a0', '#606060', '#000000'],
  nes: ['#2b3035', '#3d6b2f', '#5b9c42', '#7cc24f', '#92cc41'],
  win95: ['#d4d4d4', '#b0b0c8', '#8080a8', '#4040a0', '#000080'],
  tui: ['#000080', '#0050a8', '#0080a8', '#00a800', '#55ff55'],
};

const QUERY = `query($login:String!){
  user(login:$login){
    contributionsCollection{
      contributionCalendar{
        weeks{ contributionDays{ contributionCount } }
      }
    }
  }
}`;

export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';
  const themeParam = url.searchParams.get('theme');
  const theme = isThemeName(themeParam) ? themeParam : 'mac';
  const scale = SCALE[theme] ?? SCALE.mac;

  const cacheKey = new Request(`${url.origin}/contrib/${user}?theme=${theme}`, { method: 'GET' });
  const cached = await cacheGet(cacheKey, 3600);
  const build = (svg: string) =>
    new Response(svg, {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600' },
    });

  if (cached) return build(await cached.text());

  if (!GITHUB_TOKEN) {
    return new Response('', { status: 503 });
  }

  let weeks: { contributionDays: { contributionCount: number }[] }[] = [];

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ query: QUERY, variables: { login: user } }),
    });

    if (!res.ok) return new Response('', { status: 502 });

    const data = (await res.json()) as CalendarResponse;
    weeks = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  } catch {
    return new Response('', { status: 502 });
  }

  if (weeks.length === 0) return new Response('', { status: 404 });

  const cell = 12;
  const gap = 3;
  const width = weeks.length * (cell + gap);
  const height = 7 * (cell + gap);

  const max = Math.max(
    1,
    ...weeks.flatMap((week) => week.contributionDays.map((day) => day.contributionCount))
  );

  const level = (count: number) => {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
  };

  const rects = weeks
    .map((week, weekIndex) =>
      week.contributionDays
        .map((day, dayIndex) => {
          const x = weekIndex * (cell + gap);
          const y = dayIndex * (cell + gap);
          return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${scale[level(day.contributionCount)]}"/>`;
        })
        .join('')
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution activity">
${rects}
</svg>`;

  await cachePut(cacheKey, new Response(svg, { headers: { 'cache-control': 'public' } }), 3600);

  return build(svg);
};
