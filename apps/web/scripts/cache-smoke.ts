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
import {
  MAX_CACHE_PAGE,
  normalizeCacheParams,
  normalizePageParam,
  normalizeTagParam,
} from '../src/lib/request-params.ts';
import { shouldSkipCache, ttlFor } from '../src/lib/cache-policy.ts';

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

assert.equal(ttlFor('/Dnevend'), 300);
assert.equal(ttlFor('/card/Dnevend'), 600);
assert.equal(ttlFor('/contrib/Dnevend.json'), 300);
assert.equal(ttlFor('/sitemap.xml'), 3600);
assert.equal(ttlFor('/sitemap/1.xml'), 3600);
assert.equal(ttlFor('/robots.txt'), 300);
assert.equal(shouldSkipCache('/setup'), true);
assert.equal(shouldSkipCache('/random'), true);
assert.equal(shouldSkipCache('/api/hit/Dnevend'), true);
assert.equal(shouldSkipCache('/robots.txt'), false);
assert.equal(shouldSkipCache('/sitemap.xml'), false);

assert.deepEqual(normalizePageParam(null), { present: false, valid: true });
assert.deepEqual(normalizePageParam('2'), {
  present: true,
  valid: true,
  value: 2,
});
assert.deepEqual(normalizePageParam('02'), {
  present: true,
  valid: true,
  value: 2,
});
assert.deepEqual(normalizePageParam(''), {
  present: true,
  valid: true,
  value: 1,
});
assert.equal(normalizePageParam('0').valid, false);
assert.equal(normalizePageParam('0').value, 1);
assert.equal(normalizePageParam('-1').valid, false);
assert.equal(normalizePageParam('abc').valid, false);
assert.equal(normalizePageParam('abc').value, 1);
assert.equal(
  normalizePageParam(String(MAX_CACHE_PAGE + 1)).valid,
  false,
  '超出范围的分页不能原样进缓存键'
);
assert.equal(
  normalizePageParam(String(MAX_CACHE_PAGE + 1)).value,
  MAX_CACHE_PAGE
);

assert.deepEqual(normalizeTagParam(null), { present: false, valid: true });
assert.deepEqual(normalizeTagParam(' AI '), {
  present: true,
  valid: true,
  value: 'ai',
});
assert.deepEqual(normalizeTagParam('长文'), {
  present: true,
  valid: true,
  value: '长文',
});
assert.deepEqual(normalizeTagParam(''), { present: true, valid: true });
assert.equal(
  normalizeTagParam('x'.repeat(65)).valid,
  false,
  '超长 tag 不能进缓存键'
);
assert.equal(
  normalizeTagParam('a\nb').valid,
  false,
  '控制字符不能进缓存键'
);
assert.equal(
  normalizeTagParam('hello world').valid,
  false,
  '带空格的输入不是 gist 标签'
);
assert.deepEqual(normalizeTagParam('a_b-c'), {
  present: true,
  valid: true,
  value: 'a_b-c',
});

const gistParams = normalizeCacheParams(
  '/Dnevend/gists',
  new URLSearchParams('tag=AI&page=9')
);
assert.deepEqual(gistParams.tag, {
  present: true,
  valid: true,
  value: 'ai',
});
assert.deepEqual(
  gistParams.page,
  { present: false, valid: true },
  'gists 不消费 page，page 不能进缓存键'
);

const repoParams = normalizeCacheParams(
  '/Dnevend/repos',
  new URLSearchParams('page=2&tag=AI')
);
assert.deepEqual(repoParams.page, {
  present: true,
  valid: true,
  value: 2,
});
assert.deepEqual(
  repoParams.tag,
  { present: false, valid: true },
  'repos 不消费 tag，tag 不能进缓存键'
);

console.log('cache smoke ok');
