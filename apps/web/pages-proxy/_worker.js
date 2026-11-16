const TARGET = 'https://classy-web.dnevend.workers.dev';

/**
 * classygit.pages.dev 是一层薄代理。
 *
 * Astro 7 + Durable Object 无法原生跑在 Pages 上，所以 Pages 只负责转发到
 * Workers；真正渲染、缓存、计数都在 Worker 里。SITE_ORIGIN 让 Worker
 * 生成的 canonical / OG / RSS / sitemap 都指向 pages.dev。
 */
export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      });
    }

    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, TARGET);

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        redirect: 'manual',
      });

      const out = new Response(response.body, response);
      out.headers.set('x-classy-proxy', 'pages');

      const location = out.headers.get('location');
      if (location) {
        try {
          const resolved = new URL(location, TARGET);
          if (resolved.host === new URL(TARGET).host) {
            out.headers.set('location', `${url.origin}${resolved.pathname}${resolved.search}`);
          }
        } catch {
          // 相对 Location 保持原样
        }
      }

      return out;
    } catch (error) {
      return new Response('Upstream unavailable', {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  },
};
