import { siteOrigin } from "../lib/site";
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const body = `User-agent: *
Allow: /

# 用户主页默认 noindex（薄内容），只有 classy.config.json 里
# 显式设置 seo.index: true 的用户才会进 sitemap
Sitemap: ${siteOrigin(url)}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=86400',
    },
  });
};
