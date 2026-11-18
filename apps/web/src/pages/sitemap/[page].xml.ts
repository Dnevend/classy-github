import { siteOrigin } from "../../lib/site";
import type { APIRoute } from 'astro';
import { listIndexableUsers, usersKv } from '../../lib/users-kv';
import { PAGE_SIZE } from '../sitemap.xml';

export const prerender = false;

export const GET: APIRoute = async ({ url, params }) => {
  const origin = siteOrigin(url);
  const page = Number(params.page ?? '1');

  if (!Number.isInteger(page) || page < 1 || page > 20) {
    return new Response('Not found', { status: 404 });
  }

  const users = await listIndexableUsers(usersKv());
  const userPaths = users.map((login) => `/${login}`);
  const fixed = ['/', '/webring', '/nft'];

  // 第一页先放固定的三条，剩余位置给用户；后面每页 PAGE_SIZE 条。
  // 注意偏移要减掉固定条目，否则边界处的用户会被跳过。
  const slice =
    page === 1
      ? [...fixed, ...userPaths.slice(0, PAGE_SIZE - fixed.length)]
      : userPaths.slice(
          (page - 1) * PAGE_SIZE - fixed.length,
          page * PAGE_SIZE - fixed.length
        );

  const urls = slice.map((path) => {
    if (path === '/') {
      return `  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`;
    }

    if (path === '/webring') {
      return `  <url><loc>${origin}/webring</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`;
    }

    if (path === '/nft') {
      return `  <url><loc>${origin}/nft</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }

    return `  <url><loc>${origin}${path}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`;
  });

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
