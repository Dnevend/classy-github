/**
 * 全站安全响应头断言。
 * 运行：node --experimental-strip-types scripts/security-headers-smoke.ts
 */
import assert from 'node:assert/strict';

import { withSecurityHeaders } from '../src/lib/security-headers.ts';

const response = withSecurityHeaders(
  new Response('ok', {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': 'probe=1; Path=/',
    },
  })
);

assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.equal(
  response.headers.get('referrer-policy'),
  'strict-origin-when-cross-origin'
);
assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
assert.match(
  response.headers.get('content-security-policy') ?? '',
  /frame-ancestors 'self'/
);
assert.equal(
  response.headers.get('set-cookie'),
  'probe=1; Path=/'
);
assert.equal(await response.text(), 'ok');

// 已有值不覆盖（例如路由自己设置的 no-store / nosniff）
const custom = withSecurityHeaders(
  new Response(null, {
    status: 204,
    headers: { 'x-frame-options': 'DENY' },
  })
);
assert.equal(custom.status, 204);
assert.equal(custom.headers.get('x-frame-options'), 'DENY');

console.log('security-headers smoke ok');
