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

/** 原始贡献数据版本；调色板不参与这个 cache key */
const DATA_VERSION = '3';
/** 贡献数据缓存 1 小时；主题只影响 palette，不再重复请求 GitHub */
const DATA_TTL = 3600;

interface ContribData {
  weeks: number[][];
  max: number;
}

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

  // 只按 user 缓存原始 weeks/max；theme 只影响下面的 palette。
  const cacheKey = new Request(
    `${url.origin}/contrib/${encodeURIComponent(user)}.json?raw=1&v=${DATA_VERSION}`,
    { method: 'GET' }
  );

  let data: ContribData | null = null;
  const cached = await cacheGet(cacheKey, DATA_TTL);
  if (cached) {
    data = (await cached.json().catch(() => null)) as ContribData | null;
  }

  if (!data) {
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

      const payload = (await res.json()) as CalendarResponse;
      weeks = (payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? []).map(
        (week) => week.contributionDays.map((day) => day.contributionCount)
      );
    } catch {
      return new Response('{"weeks":[]}', { status: 502 });
    }

    data = { weeks, max: Math.max(1, ...weeks.flat()) };
    await cachePut(
      cacheKey,
      new Response(JSON.stringify(data), {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
      DATA_TTL
    );
  }

  const body = JSON.stringify({ weeks: data.weeks, palette, max: data.max });

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
