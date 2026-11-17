/**
 * Pages 薄代理的 Service binding / 回退 / 302 Location 重写断言。
 * 运行：node --experimental-strip-types scripts/pages-proxy-smoke.ts
 */
import assert from 'node:assert/strict';

import proxy from '../pages-proxy/_worker.js';

let targetUrl = '';
let forwardedHost = '';
let forwardedProto = '';

const response = await proxy.fetch(
  new Request('https://classygit.pages.dev/Dnevend?theme=nes', {
    headers: {
      'cf-connecting-ip': '203.0.113.7',
      'user-agent': 'pages-proxy-smoke',
    },
  }),
  {
    CLASSY_WEB: {
      async fetch(request: Request) {
        targetUrl = request.url;
        forwardedHost = request.headers.get('x-forwarded-host') ?? '';
        forwardedProto = request.headers.get('x-forwarded-proto') ?? '';
        return new Response('from-worker', {
          status: 200,
          headers: { 'x-worker': 'yes' },
        });
      },
    },
  }
);

assert.equal(response.status, 200);
assert.equal(await response.text(), 'from-worker');
assert.equal(response.headers.get('x-worker'), 'yes');
assert.equal(response.headers.get('x-classy-proxy'), 'pages');
assert.equal(response.headers.get('x-classy-proxy-mode'), 'service-binding');
assert.equal(
  targetUrl,
  'https://classy-web.dnevend.workers.dev/Dnevend?theme=nes'
);
assert.equal(forwardedHost, 'classygit.pages.dev');
assert.equal(forwardedProto, 'https');

const rejected = await proxy.fetch(
  new Request('https://classygit.pages.dev/Dnevend', { method: 'POST' }),
  {
    CLASSY_WEB: {
      async fetch() {
        throw new Error('POST 不应该转发');
      },
    },
  }
);
assert.equal(rejected.status, 405);

// 没有 Service binding 时回退公网 fetch。
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = (async () =>
    new Response('from-public-fetch', {
      status: 200,
    })) as typeof fetch;

  const fallback = await proxy.fetch(
    new Request('https://classygit.pages.dev/Dnevend'),
    {}
  );
  assert.equal(await fallback.text(), 'from-public-fetch');
  assert.equal(fallback.headers.get('x-classy-proxy-mode'), 'public-fetch');

  // 302 的 workers.dev Location 要改回 pages.dev。
  globalThis.fetch = (async () =>
    new Response(null, {
      status: 302,
      headers: {
        location: 'https://classy-web.dnevend.workers.dev/foo?x=1',
      },
    })) as typeof fetch;

  const redirect = await proxy.fetch(
    new Request('https://classygit.pages.dev/Dnevend'),
    {}
  );
  assert.equal(redirect.status, 302);
  assert.equal(
    redirect.headers.get('location'),
    'https://classygit.pages.dev/foo?x=1'
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log('pages proxy smoke ok');
