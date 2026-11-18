/**
 * stale-while-revalidate 的断言测试。
 * 运行：node --experimental-strip-types scripts/swr-smoke.ts
 */
import assert from 'node:assert/strict';

import { CACHED_AT_HEADER } from '../src/lib/edge-cache.ts';
import {
  serveStaleWhileRevalidate,
  SWR_STALE_TTL,
} from '../src/lib/stale-html.ts';
import { resetSingleFlight } from '../src/lib/single-flight.ts';

class MemoryCache {
  readonly map = new Map<string, Response>();

  async match(key: Request) {
    return this.map.get(key.url)?.clone();
  }

  async put(key: Request, response: Response) {
    this.map.set(key.url, response.clone());
  }

  async delete(key: Request) {
    return this.map.delete(key.url);
  }
}

const cache = new MemoryCache();
(globalThis as { caches?: { default?: unknown } }).caches = { default: cache };

const key = (name: string) => new Request(`https://classy.test/${name}`, { method: 'GET' });

const seed = (request: Request, html: string, ageSeconds: number) => {
  const response = new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
  response.headers.set(CACHED_AT_HEADER, String(Date.now() - ageSeconds * 1000));
  cache.map.set(request.url, response);
};

const collect = () => {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil: (promise: Promise<unknown>) => pending.push(promise),
  };
};

// 1. 过期但还在 SWR 窗口：先返回旧页面，后台写回新页面。
{
  resetSingleFlight();
  const request = key('swr-basic');
  seed(request, 'stale-page', 3600);

  let calls = 0;
  const gate = collect();
  const response = await serveStaleWhileRevalidate({
    key: request,
    staleTtl: SWR_STALE_TTL,
    ttl: 300,
    revalidate: async () => {
      calls += 1;
      return new Response('fresh-page', {
        headers: { 'content-type': 'text/html' },
      });
    },
    waitUntil: gate.waitUntil,
  });

  assert.ok(response, '过期但可用的 HTML 应该返回');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'stale-page');
  assert.equal(response.headers.get('x-classy-cache'), 'STALE');
  assert.equal(response.headers.get('x-classy-swr'), '1');
  assert.ok(Number(response.headers.get('x-classy-cache-age')) >= 3600);
  assert.equal(calls, 1, '应立即触发一次后台刷新');

  await Promise.all(gate.pending);

  const cached = cache.map.get(request.url);
  assert.ok(cached);
  assert.equal(await cached.text(), 'fresh-page');
  assert.equal(calls, 1);
}

// 2. 并发请求共用一次后台刷新。
{
  resetSingleFlight();
  const request = key('swr-single-flight');
  seed(request, 'stale-page', 3600);

  let release!: () => void;
  const blocker = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const revalidate = async () => {
    calls += 1;
    await blocker;
    return new Response('fresh-page');
  };

  const first = collect();
  const second = collect();

  const [a, b] = await Promise.all([
    serveStaleWhileRevalidate({
      key: request,
      staleTtl: SWR_STALE_TTL,
      ttl: 300,
      revalidate,
      waitUntil: first.waitUntil,
    }),
    serveStaleWhileRevalidate({
      key: request,
      staleTtl: SWR_STALE_TTL,
      ttl: 300,
      revalidate,
      waitUntil: second.waitUntil,
    }),
  ]);

  assert.ok(a);
  assert.ok(b);
  assert.equal(calls, 1, '同一 key 的并发刷新应合并');

  release();
  await Promise.all([...first.pending, ...second.pending]);
  assert.equal(calls, 1);
}

// 3. 后台刷新返回 404：删掉旧条目，避免继续返回已删除用户的主页。
{
  resetSingleFlight();
  const request = key('swr-404');
  seed(request, 'stale-page', 3600);

  const gate = collect();
  await serveStaleWhileRevalidate({
    key: request,
    staleTtl: SWR_STALE_TTL,
    ttl: 300,
    revalidate: async () => new Response('not found', { status: 404 }),
    waitUntil: gate.waitUntil,
  });
  await Promise.all(gate.pending);

  assert.equal(cache.map.has(request.url), false, '404 应删除旧缓存');
}

// 4. 后台刷新返回 503：保留旧页面，等下次再试。
{
  resetSingleFlight();
  const request = key('swr-503');
  seed(request, 'stale-page', 3600);

  const gate = collect();
  await serveStaleWhileRevalidate({
    key: request,
    staleTtl: SWR_STALE_TTL,
    ttl: 300,
    revalidate: async () => new Response('upstream down', { status: 503 }),
    waitUntil: gate.waitUntil,
  });
  await Promise.all(gate.pending);

  const cached = cache.map.get(request.url);
  assert.ok(cached);
  assert.equal(await cached.text(), 'stale-page');
}

// 5. 没有旧页面 / 超出 stale 窗口：不做 SWR。
{
  resetSingleFlight();
  const missing = key('swr-missing');
  assert.equal(
    await serveStaleWhileRevalidate({
      key: missing,
      staleTtl: SWR_STALE_TTL,
      ttl: 300,
      revalidate: async () => new Response('fresh-page'),
      waitUntil: () => undefined,
    }),
    undefined
  );

  const tooOld = key('swr-too-old');
  seed(tooOld, 'ancient-page', SWR_STALE_TTL + 60);
  assert.equal(
    await serveStaleWhileRevalidate({
      key: tooOld,
      staleTtl: SWR_STALE_TTL,
      ttl: 300,
      revalidate: async () => new Response('fresh-page'),
      waitUntil: () => undefined,
    }),
    undefined
  );
}

console.log('swr-smoke: ok');
