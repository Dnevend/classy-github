/**
 * stale HTML 兜底逻辑的断言测试。
 * 运行：node --experimental-strip-types scripts/stale-html-smoke.ts
 */
import assert from 'node:assert/strict';

import { CACHED_AT_HEADER, cachePut } from '../src/lib/edge-cache.ts';
import {
  isStaleEligible,
  serveStaleHtml,
} from '../src/lib/stale-html.ts';

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

const key = new Request('https://classy.test/stale-html', { method: 'GET' });
const html = new Response('<!doctype html><h1>cached</h1>', {
  headers: { 'content-type': 'text/html; charset=utf-8' },
});
await cachePut(key, html, 300);

// 模拟 1 小时前的 HTML（超过正常 TTL，但在 24h stale 窗口内）
const stored = cache.map.get(key.url);
assert.ok(stored);
stored.headers.set(CACHED_AT_HEADER, String(Date.now() - 3_600_000));

const fallback = await serveStaleHtml(key, 503);
assert.ok(fallback, '上游 503 且有旧 HTML 时应返回兜底');
assert.equal(fallback.status, 200);
assert.equal(fallback.headers.get('x-classy-cache'), 'STALE');
assert.equal(fallback.headers.get('x-classy-stale'), '1');
assert.equal(fallback.headers.get('cache-control'), 'public, s-maxage=30');
assert.match(await fallback.text(), /cached/);

assert.equal(
  await serveStaleHtml(key, 404),
  undefined,
  '404 不应兜底'
);
assert.equal(
  await serveStaleHtml(new Request('https://classy.test/empty'), 503),
  undefined,
  '没有旧缓存时不应兜底'
);

assert.equal(isStaleEligible(500), true);
assert.equal(isStaleEligible(503), true);
assert.equal(isStaleEligible(404), false);

console.log('stale html smoke ok');
