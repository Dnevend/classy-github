import type { APIRoute } from 'astro';
import { cacheGet, cachePut } from '../../../lib/edge-cache';
import { RING_PREFIX, listSites } from '../../../lib/site-registry';
import { usersKv } from '../../../lib/users-kv';
import { pickNeighbors } from '../../../lib/webring';

export const prerender = false;

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const TTL = 60;

/**
 * 网站环邻居：给页脚 widget 用。
 * 响应缓存 60s，成员变化最多一分钟生效。
 */
export const GET: APIRoute = async ({ url }) => {
  const user = url.searchParams.get('user') ?? '';

  if (!LOGIN.test(user)) {
    return new Response('Invalid GitHub login', { status: 400 });
  }

  const key = new Request(
    `${url.origin}/api/ring/neighbors?user=${user.toLowerCase()}`,
    { method: 'GET' }
  );

  const cached = await cacheGet(key, TTL);
  if (cached) return cached;

  const sites = await listSites(usersKv(), RING_PREFIX);
  const neighbors = pickNeighbors(sites, user);

  const response = Response.json(neighbors, {
    headers: {
      'cache-control': `public, s-maxage=${TTL}`,
      'x-content-type-options': 'nosniff',
    },
  });

  await cachePut(key, response.clone(), TTL);
  return response;
};
