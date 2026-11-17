# M36 · classygit.dev 主域名 + 分享卡封面同源

> 日期：2026-11-17　分支：`main`

## 范围

- Worker 绑定新主域名 `classygit.dev`，`SITE_ORIGIN=https://classygit.dev`；
  canonical / OG / RSS / sitemap / 分享链接统一指向新域名。
- `classygit.pages.dev` 保留为 Pages 薄代理，两个入口都能访问；canonical
  始终指向 `classygit.dev`。
- `profile.cover` 支持站内根路径（如 `/images/cover.jpg`），不再强制 http(s)。
- 分享卡 / 资料卡封面把本站绝对 URL 归一化为同源路径，修复封面在
  `classygit.dev` 与 `classygit.pages.dev` 之间跨域加载失败的问题。
- OG 图解析相对 cover 时走 `ASSETS`，不依赖公网回源。

## 实现

### 封面同源

新增 `src/lib/site-url.ts`：

```text
sameOriginPath(value, origin)
  ├─ /images/...                     → 原样
  ├─ https://<origin>/images/...     → /images/...
  └─ 外链 / 协议相对 / 非法值         → 原样
```

`ProfileCover.astro` 与 `ShareCard.astro` 都用它处理 `profile.cover`。
分享卡的 `<img crossorigin="anonymous">` 因此在 dev / pages.dev /
workers.dev / localhost 下都是同源，浏览器不再要求静态资源返回 CORS 头，
`modern-screenshot` 导出时也能正常 fetch。

### 配置与 OG

- `config.ts`：`profile.cover` 接受 http(s) 或 `/...`；`//host/...` 仍拒绝。
- `classy.config.json`：`cover` 改为 `/images/cover.jpg`。
- `setup.astro`：cover 输入改为文本框，提交时允许站内路径。
- `og/[user].png.ts`：`new URL(cover, siteOrigin(url))` 解析；同源走
  `ASSETS`，按 pathname 取资源，兜底用解析后的绝对 URL。

### 缓存

`CACHE_VERSION` 34 → 35，旧 HTML 缓存立即失效；`PREVIOUS_CACHE_VERSIONS`
补 `'34'`，部署迁移期仍可回退旧 HTML。

### 附带：TUI 滚动条 404

`tuicss` 的 `::-webkit-scrollbar-track` 引用了未随 npm 包发布的
`images/scroll-*.png`，构建后会被解析成 `/_astro/images/scroll-*.png` 并
404。`src/themes/tui/theme.css` 用纯色轨道覆盖，避免每次打开 TUI 页面
产生失败请求。

## 验证

### 本地

```text
pnpm --filter @classy/web check   → 0 errors
pnpm --filter @classy/web test    → 全部 smoke 通过（config 21 / site-url 5）
pnpm --filter @classy/web build   → Complete
```

### 生产

Worker version `61d97b9c-aa5d-492b-9cc8-7aeb8f879bf7`（`pnpm deploy:web`）：

```text
GET https://classygit.dev/Dnevend                 200
  cover       = /images/cover.jpg
  canonical   = https://classygit.dev/Dnevend
  og:image    = https://classygit.dev/og/Dnevend.png?theme=mac&v=3
GET https://classygit.pages.dev/Dnevend           200, x-classy-proxy: pages
  cover       = /images/cover.jpg
  canonical   = https://classygit.dev/Dnevend
GET https://classygit.dev/images/cover.jpg        200 image/jpeg 1280×997
GET https://classygit.dev/og/Dnevend.png          200 image/png 1200×630
GET https://classygit.pages.dev/og/Dnevend.png    200 image/png 1200×630
GET https://classygit.dev/robots.txt              Sitemap: https://classygit.dev/sitemap.xml
GET https://classygit.pages.dev/robots.txt        同上
GET https://classygit.dev/sitemap.xml             https://classygit.dev/sitemap/1.xml
GET https://classygit.dev/Dnevend/rss.xml         https://classygit.dev/Dnevend
GET https://classygit.pages.dev/Dnevend/rss.xml   同上
```

- 浏览器实测两个入口的 `.share-card__cover` 都是 `src="/images/cover.jpg"`，
  `naturalWidth=1280`，控制台无图片 CORS 报错。
- 分享卡「保存图片」成功导出 `classy-Dnevend.png`（1,556,039 bytes），
  封面、头像、二维码都在图里。
- `classygit.pages.dev` 仍走 Pages Service binding：`x-classy-proxy: pages`、
  `x-classy-proxy-mode: service-binding`。
- TUI 主题页（`?theme=tui`）不再请求 `/_astro/images/scroll-*.png`，
  `performance` 里没有 404 资源。

