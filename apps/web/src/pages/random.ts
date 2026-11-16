import type { APIRoute } from 'astro';
import { DISCOVER_PREFIX, listSites } from '../lib/site-registry';
import { usersKv } from '../lib/users-kv';

export const prerender = false;

/**
 * 随机逛一个开了 `discover` 的站点。
 * 直接 302，不渲染页面；没有成员时回网站环目录。
 */
export const GET: APIRoute = async () => {
  const sites = await listSites(usersKv(), DISCOVER_PREFIX);

  if (sites.length === 0) {
    return new Response(null, {
      status: 302,
      headers: { location: '/webring', 'cache-control': 'no-store' },
    });
  }

  const site = sites[Math.floor(Math.random() * sites.length)];

  return new Response(null, {
    status: 302,
    headers: {
      location: `/${encodeURIComponent(site.login)}?ref=random`,
      'cache-control': 'no-store',
    },
  });
};
