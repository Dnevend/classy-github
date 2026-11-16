# M15 · classygit.pages.dev + 合并 main

> 日期：2026-11-16　分支：`main` / `v2`

## 范围

- `v2` 快进合并到 `main`（`main` 原本是 v1 冻结版）；仓库默认分支改为 `main`。
- 新增 `SITE_ORIGIN`，canonical / OG / RSS / sitemap / 分享链接统一使用
  `https://classygit.pages.dev`。
- `classygit.pages.dev`：Cloudflare Pages 薄代理 → `classy-web.dnevend.workers.dev`。
  Astro 7 + Durable Object 无法原生跑 Pages，Pages 只负责转发。
- `classy.config.json` 开启 `webring.enabled` / `discover.enabled`。

## 实现

### 对外 origin

`lib/site.ts` 的 `siteOrigin(url)`：

- `import.meta.env.DEV` 时返回请求 origin（本地仍是 localhost）；
- 生产读 Worker var `SITE_ORIGIN=https://classygit.pages.dev`；
- 兜底请求 origin。

所有面向用户的 `origin`（页面 canonical、OG、RSS、sitemap、badge 片段、setup）
都改为 `siteOrigin()`；缓存键 / ASSETS 字体等内部 URL 仍用请求 origin。

### Pages 代理

`apps/web/pages-proxy/_worker.js`：

- 只接受 GET / HEAD；
- 转发到 `https://classy-web.dnevend.workers.dev`，保留路径 / query；
- 回写 `Location` 为 pages.dev；
- 加 `x-classy-proxy: pages`；
- 上游失败返回 502。

部署：`pnpm deploy:pages`（项目名 `classygit`，分支 `main`）。

### 合并

`main` 是 `v2` 的祖先，直接 `git merge --ff-only v2`，无冲突。
合并后 GitHub 默认分支改为 `main`，repo homepage 改为 `https://classygit.pages.dev`。

## 验证

```text
GET https://classygit.pages.dev/                    200, x-classy-proxy: pages
GET https://classygit.pages.dev/Dnevend             200
  canonical = https://classygit.pages.dev/Dnevend
  og:image  = https://classygit.pages.dev/og/Dnevend.png?theme=mac
GET https://classygit.pages.dev/Dnevend/rss.xml     200 application/atom+xml
GET https://classygit.pages.dev/sitemap/1.xml       含 https://classygit.pages.dev/webring
GET https://classygit.pages.dev/og/Dnevend.png      200 image/png 1200×630
GET https://classygit.pages.dev/setup?u=Dnevend     200
GET https://classygit.pages.dev/webring             显示 Dnevend（1 个站点）
GET https://classygit.pages.dev/api/ring/neighbors?user=Dnevend
  {"member":true,"count":1}
GET https://classygit.pages.dev/random              302 → /dnevend?ref=random
```

- Playwright：pages.dev 的 `/Dnevend` 样式加载、canonical、hit counter、
  webring widget 元素均正常。
- Worker version `386927c2-a8d7-42c7-b623-1eb8fe2137af`；
  Pages 代理部署 `042433cf.classygit.pages.dev` → production `classygit.pages.dev`。
- CI run `43867351271` 通过。

## 已知限制

- **Pages 代理是手动部署**：`pnpm deploy:pages`；Worker 更新用 `pnpm deploy:web`，
  两者不是同一条流水线。若只在 Pages 上改代码，不会生效。
- 网站环 widget 需要至少 3 个 opt-in 站点才显示；现在只有 Dnevend 1 个，
  `/webring` 目录可见，页脚「上一站/随机/下一站」仍隐藏。
- 旧的 `classy-github.pages.dev`（v1）和 Git 集成的 Preview 部署仍在，不是当前站点。
- Pages 代理多一跳网络；HTML 仍由 Worker 边缘缓存，实际 TTFB 需观察。
