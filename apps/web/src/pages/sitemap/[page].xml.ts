import type { APIRoute } from 'astro';
import { listIndexableUsers, usersKv } from '../../lib/users-kv';
import { PAGE_SIZE } from '../sitemap.xml';

export const prerender = false;

export const GET: APIRoute = async ({ url, params }) => {
  const origin = url.origin;
  const page = Number(params.page ?? '1');

  if (!Number.isInteger(page) || page < 1 || page > 20) {
    return new Response('Not found', { status: 404 });
  }

  const users = await listIndexableUsers(usersKv());

  // 第一页带上首页，其余页只放用户
  const entries = page === 1 ? [null, ...users] : users;
  const slice = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const urls = slice.map((login) =>
    login === null
      ? `  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`
      : `  <url><loc>${origin}/${login}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
