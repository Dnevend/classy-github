/**
 * GraphQL / REST 共用限流熔断标记的断言测试。
 * 运行：node --experimental-strip-types scripts/rate-limit-marker-smoke.ts
 */
import assert from 'node:assert/strict';

import { CACHED_AT_HEADER } from '../src/lib/edge-cache.ts';
import {
  rateLimitMarkerKey,
  readRateLimitMarker,
  writeRateLimitMarker,
} from '../src/lib/github-rate-limit-marker.ts';

class MemoryCache {
  readonly map = new Map<string, Response>();

  async match(key: Request) {
    return this.map.get(key.url)?.clone();
  }

  async put(key: Request, response: Response) {
    this.map.set(key.url, response.clone());
  }
}

const cache = new MemoryCache();
(globalThis as { caches?: { default?: unknown } }).caches = { default: cache };

const now = Date.now() / 1000;

await writeRateLimitMarker('graphql', { resetAt: now + 3600 }, 403);

const marker = await readRateLimitMarker('graphql');
assert.ok(marker, '写入后应该能读到 GraphQL 熔断标记');
assert.equal(marker.resource, 'graphql');
assert.ok(marker.until >= now + 30);
assert.ok(marker.until <= now + 301);

assert.equal(
  await readRateLimitMarker('core'),
  null,
  'REST 和 GraphQL 的熔断标记必须隔离'
);

// 标记过期后不应继续拦截
const stored = cache.map.get(rateLimitMarkerKey('graphql').url);
assert.ok(stored);
stored.headers.set(CACHED_AT_HEADER, String(Date.now() - 400_000));
assert.equal(await readRateLimitMarker('graphql'), null);

console.log('rate limit marker smoke ok');
