import { siteOrigin } from "../lib/site";
import type { APIRoute } from 'astro';
import { listIndexableUsers, usersKv } from '../lib/users-kv';

export const prerender = false;

/** 每个分片最多 5000 条（sitemap 协议上限是 5 万条/文件，这里留足余量） */
export const PAGE_SIZE = 5000;

export const GET: APIRoute = async ({ url }) => {
  const origin = siteOrigin(url);
  const users = await listIndexableUsers(usersKv());

  // 首页 + 网站环 + Pass 落地页 + 用户页
  const total = 3 + users.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: pages }, (_, index) => `  <sitemap><loc>${origin}/sitemap/${index + 1}.xml</loc></sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600',
    },
  });
};
