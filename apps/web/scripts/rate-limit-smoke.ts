/**
 * 403 分类 / 限流熔断窗口的断言测试。
 * 运行：node --experimental-strip-types scripts/rate-limit-smoke.ts
 */
import assert from 'node:assert/strict';

import {
  parseRateLimit,
  RATE_LIMIT_LOCK_MAX,
  rateLimitLockUntil,
} from '../src/lib/github-rate-limit.ts';

const primary = new Response('API rate limit exceeded', {
  status: 403,
  headers: {
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': '1794872666',
  },
});
assert.deepEqual(parseRateLimit(primary, 'API rate limit exceeded'), {
  remaining: 0,
  resetAt: 1794872666,
  retryAfter: undefined,
});

const permission = new Response('Resource not accessible by integration', {
  status: 403,
  headers: { 'x-ratelimit-remaining': '4999' },
});
assert.equal(
  parseRateLimit(permission, 'Resource not accessible by integration'),
  undefined,
  '权限错误不能当成限流'
);

const secondary = new Response('You have exceeded a secondary rate limit', {
  status: 403,
  headers: { 'retry-after': '30' },
});
assert.deepEqual(parseRateLimit(secondary, 'You have exceeded a secondary rate limit'), {
  remaining: undefined,
  resetAt: undefined,
  retryAfter: 30,
});

const tooMany = new Response('', { status: 429 });
assert.deepEqual(parseRateLimit(tooMany, ''), {
  remaining: undefined,
  resetAt: undefined,
  retryAfter: undefined,
});

const now = 1_700_000_000;
assert.equal(
  rateLimitLockUntil({ resetAt: now + 3600 }, now),
  now + RATE_LIMIT_LOCK_MAX,
  '一小时后的 reset 只熔断 5 分钟'
);
assert.equal(
  rateLimitLockUntil({ resetAt: now + 60 }, now),
  now + 60,
  '较近的 reset 按 reset 时间熔断'
);
assert.equal(
  rateLimitLockUntil({ retryAfter: 10 }, now),
  now + 30,
  'retry-after 太短时至少锁 30 秒'
);

console.log('rate limit smoke ok');
