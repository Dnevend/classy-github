import type { APIRoute } from 'astro';
import { USER_AGENT } from '../../lib/constants';
import { cacheGet, cachePut } from '../../lib/edge-cache';
import { getGitHubToken } from '../../lib/github-auth';
import { isThemeName } from '../../lib/theme';

export const prerender = false;

interface CalendarResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks: { contributionDays: { contributionCount: number }[] }[];
        };
      };
    };
  };
}

const PALETTE: Record<string, string[]> = {
  mac: ['#f0f0f0', '#d0d0d0', '#a0a0a0', '#606060', '#000000'],
  nes: ['#3d454e', '#3d6b2f', '#5b9c42', '#7cc24f', '#92cc41'],
  win98: ['#d4d4d4', '#b0b0c8', '#8080a8', '#4040a0', '#000080'],
  tui: ['#000080', '#0050a8', '#0080a8', '#00a800', '#55ff55'],
};

/** 调色板改动时 +1，让旧的 1 小时边缘缓存立即失效 */
const PALETTE_VERSION = '2';

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
  const palette = PALETTE[theme] ?? PALETTE.mac;

  const cacheKey = new Request(`${url.origin}/contrib/${user}.json?theme=${theme}&v=${PALETTE_VERSION}`, { method: 'GET' });
  const cached = await cacheGet(cacheKey, 3600);
  if (cached) return cached;

  const token = await getGitHubToken();
  if (!token) return new Response('{"weeks":[]}', { status: 503 });

  let weeks: number[][] = [];

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ query: QUERY, variables: { login: user } }),
    });

    if (!res.ok) return new Response('{"weeks":[]}', { status: 502 });

    const data = (await res.json()) as CalendarResponse;
    weeks = (data.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? []).map((week) =>
      week.contributionDays.map((day) => day.contributionCount)
    );
  } catch {
    return new Response('{"weeks":[]}', { status: 502 });
  }

  const max = Math.max(1, ...weeks.flat());
  const body = JSON.stringify({ weeks, palette, max });

  const response = new Response(body, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
  await cachePut(cacheKey, response, 3600);

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
