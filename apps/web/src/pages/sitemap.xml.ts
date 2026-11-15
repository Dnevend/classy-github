import type { APIRoute } from 'astro';
import { listIndexableUsers, usersKv } from '../lib/users-kv';

export const prerender = false;

const SITE = 'https://classy-web.dnevend.workers.dev';

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin || SITE;
  const users = await listIndexableUsers(usersKv());

  const urls = [
    { loc: `${origin}/`, changefreq: 'weekly', priority: '1.0' },
    ...users.map((login) => ({
      loc: `${origin}/${login}`,
      changefreq: 'daily' as const,
      priority: '0.6',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) =>
      `  <url><loc>${entry.loc}</loc><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
