import type { APIRoute } from 'astro';
import { renderBadgeSvg } from '../../lib/badge';

export const prerender = false;

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/**
 * 88×31 复古徽章。
 *
 * 纯 SVG、无外部字体、无 GitHub API 调用，所以可以放心给 1 天缓存。
 * 主题名沿用 `?theme=`，`win95` 会归一为 `win98`。
 */
export const GET: APIRoute = async ({ params, url }) => {
  const user = params.user ?? '';

  if (!LOGIN.test(user)) {
    return new Response('Invalid GitHub login', { status: 400 });
  }

  const svg = renderBadgeSvg(user, url.searchParams.get('theme'));

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, s-maxage=86400',
      'x-content-type-options': 'nosniff',
    },
  });
};
