/**
 * 偏好 cookie 的写入边界：只有顶层 HTML 导航可以持久化主题 / 语言。
 *
 * 回归场景：README 里的
 *   /badge/<user>.svg?theme=mac|win98|tui
 * 会以 `Sec-Fetch-Dest: image` 并发请求；如果这些子资源也写
 * `classy_theme`，最后一个返回的徽章会决定下次刷新的主题。
 *
 * `node --experimental-strip-types scripts/document-request-smoke.ts`
 */
import assert from 'node:assert/strict';

import { isDocumentNavigation } from '../src/lib/document-request.ts';

const nav = (
  overrides: Partial<Parameters<typeof isDocumentNavigation>[0]> = {}
) =>
  isDocumentNavigation({
    method: 'GET',
    pathname: '/dnevend',
    destination: 'document',
    accept: 'text/html,application/xhtml+xml',
    ...overrides,
  });

// 顶层 HTML 导航：普通用户页、首页、用户页子路径、仓库文件页（带扩展名）
for (const pathname of [
  '/dnevend',
  '/',
  '/dnevend/repos',
  '/dnevend/gists',
  '/dnevend/repo/classy-github',
  '/dnevend/repo/classy-github/blob/main/src/index.ts',
  '/dnevend/repo/classy-github/blob/main/pom.xml',
  '/badge/dnevend',
  '/setup',
  '/webring',
]) {
  assert.equal(nav({ pathname }), true, pathname);
}

// 图片 / JSON / fetch 子资源：即使带 ?theme= 也不能写 cookie
// （pathname 不包含 query；这里模拟 Astro 的 url.pathname）
for (const pathname of [
  '/badge/dnevend.svg',
  '/contrib/dnevend.json',
  '/og/dnevend.png',
  '/card/dnevend',
  '/api/hit/dnevend',
  '/api/ring/neighbors',
  '/sitemap.xml',
  '/sitemap/1.xml',
  '/robots.txt',
  '/images/cover.jpg',
  '/fonts/inter.woff2',
  '/cursors/mac-arrow.svg',
  '/dnevend/rss.xml',
]) {
  assert.equal(
    nav({ pathname, destination: 'image', accept: 'image/svg+xml' }),
    false,
    pathname
  );
}

// 浏览器 fetch() / XHR 的 Sec-Fetch-Dest 是 empty
assert.equal(
  nav({
    pathname: '/contrib/dnevend.json',
    destination: 'empty',
    accept: '*/*',
  }),
  false
);

// 非 GET 不写偏好
assert.equal(nav({ method: 'POST' }), false);
assert.equal(nav({ method: 'HEAD' }), false);

// 预取 / 预渲染不是用户显式选择（Chrome 的 Sec-Purpose / 旧版 Purpose）
assert.equal(nav({ purpose: 'prefetch' }), false);
assert.equal(nav({ purpose: 'prerender' }), false);
assert.equal(
  nav({
    pathname: '/dnevend/repo/classy-github/blob/main/src/index.ts',
    purpose: 'prefetch',
  }),
  false
);

// 没有 Sec-Fetch-Dest 的老客户端：Accept 必须是 HTML
assert.equal(nav({ destination: null }), true);
assert.equal(nav({ destination: null, accept: '*/*' }), false);
assert.equal(nav({ destination: null, accept: 'application/json' }), false);
assert.equal(
  nav({ destination: null, accept: 'application/rss+xml' }),
  false
);

// 阅读器直接打开 RSS（即使被当成 document）也不改主题
assert.equal(nav({ pathname: '/dnevend/rss.xml', destination: 'document' }), false);

console.log('document request smoke ok');
