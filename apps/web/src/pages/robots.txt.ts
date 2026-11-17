import { siteOrigin } from "../lib/site";
import { buildRobotsTxt } from '../lib/robots';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  return new Response(buildRobotsTxt(siteOrigin(url)), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // 收紧后的规则要尽快生效，不要按天缓存。
      'cache-control': 'public, s-maxage=300',
    },
  });
};
