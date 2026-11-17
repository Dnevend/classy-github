/**
 * Worker 入口限流规则 / 执行分支的纯函数断言。
 * 运行：node --experimental-strip-types scripts/worker-rate-limit-smoke.ts
 */
import assert from 'node:assert/strict';

import {
  clientIp,
  enforceRateLimits,
  RATE_LIMIT_BINDINGS,
  rateLimitRuleFor,
} from '../src/lib/rate-limit.ts';

const rule = (url: string) => rateLimitRuleFor(new URL(url));

assert.equal(rule('https://x.test/Dnevend?preview=1'), 'preview');
assert.equal(rule('https://x.test/Dnevend?preview=1&theme=nes'), 'preview');
assert.equal(rule('https://x.test/random'), 'random');
assert.equal(rule('https://x.test/random/'), 'random');
assert.equal(rule('https://x.test/api/hit/Dnevend'), 'api');
assert.equal(rule('https://x.test/api/ring/neighbors?user=Dnevend'), 'api');
assert.equal(rule('https://x.test/contrib/Dnevend.json'), 'api');
assert.equal(rule('https://x.test/og/Dnevend.png'), 'og');
assert.equal(rule('https://x.test/card/Dnevend.svg'), 'og');
assert.equal(rule('https://x.test/badge/Dnevend.svg'), 'badge');
assert.equal(rule('https://x.test/Dnevend'), undefined);
assert.equal(rule('https://x.test/Dnevend/gists?tag=ai'), undefined);

assert.equal(
  clientIp(
    new Request('https://x.test', {
      headers: { 'cf-connecting-ip': '203.0.113.7' },
    })
  ),
  '203.0.113.7'
);
assert.equal(
  clientIp(
    new Request('https://x.test', {
      headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    })
  ),
  '198.51.100.9'
);
assert.equal(clientIp(new Request('https://x.test')), 'unknown');

const limiter = (success: boolean) => ({
  async limit() {
    return { success };
  },
});

const request = (url: string) =>
  new Request(url, {
    headers: { 'cf-connecting-ip': '203.0.113.7' },
  });

// 正常请求没有规则 → 不调用 binding。
assert.equal(
  await enforceRateLimits(request('https://x.test/Dnevend'), {}),
  undefined
);

// 命中 per-IP 拒绝 → 429。
const previewLimited = await enforceRateLimits(
  request('https://x.test/Dnevend?preview=1'),
  {
    PREVIEW_GLOBAL_LIMITER: limiter(true),
    PREVIEW_LIMITER: limiter(false),
  }
);
assert.equal(previewLimited?.status, 429);

// badge 只有 per-IP 桶，没有 global 桶；锁死这个设计，避免以后误加全局桶。
assert.equal(RATE_LIMIT_BINDINGS.badge.global, undefined);
const badgeLimited = await enforceRateLimits(
  request('https://x.test/badge/Dnevend.svg'),
  { BADGE_LIMITER: limiter(false) }
);
assert.equal(badgeLimited?.status, 429);

// OG/card 走 global 桶；global 拒绝时直接 429。
const ogLimited = await enforceRateLimits(
  request('https://x.test/og/Dnevend.png'),
  {
    ASSET_GLOBAL_LIMITER: limiter(false),
    ASSET_LIMITER: limiter(true),
  }
);
assert.equal(ogLimited?.status, 429);

// binding 抛错时 fail open。
const failedOpen = await enforceRateLimits(
  request('https://x.test/random'),
  {
    RANDOM_GLOBAL_LIMITER: limiter(true),
    RANDOM_LIMITER: {
      async limit() {
        throw new Error('rate limit backend down');
      },
    },
  }
);
assert.equal(failedOpen, undefined);

// binding 缺失时 fail open。
assert.equal(
  await enforceRateLimits(request('https://x.test/random'), {}),
  undefined
);

console.log('worker rate limit smoke ok');
