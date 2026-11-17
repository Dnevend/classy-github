/**
 * 边缘缓存 TTL / stale 读取的断言测试。
 * 运行：node --experimental-strip-types scripts/cache-smoke.ts
 */
import assert from 'node:assert/strict';

import {
  CACHED_AT_HEADER,
  cacheGet,
  cacheGetStale,
  cachePut,
} from '../src/lib/edge-cache.ts';

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

const key = new Request('https://classy.test/cache-smoke', { method: 'GET' });
const body = new Response(JSON.stringify({ ok: true }), {
  headers: { 'content-type': 'application/json' },
});

await cachePut(key, body, 60);

const fresh = await cacheGet(key, 60);
assert.ok(fresh, '刚写入的缓存应该命中');
assert.deepEqual(await fresh.json(), { ok: true });

const stored = cache.map.get(key.url);
assert.ok(stored, 'mock cache 里应该有响应');
stored.headers.set(CACHED_AT_HEADER, String(Date.now() - 120_000));

assert.equal(await cacheGet(key, 60), undefined, '过期后 cacheGet 应返回 undefined');

const stale = await cacheGetStale(key, 3600);
assert.ok(stale, 'stale 窗口内应该能读到旧缓存');
assert.deepEqual(await stale.json(), { ok: true });

assert.equal(
  await cacheGetStale(key, 1),
  undefined,
  '超过 staleTtl 的缓存不能再用'
);

console.log('cache smoke ok');
