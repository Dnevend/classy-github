# M38 · 主题偏好 cookie 只允许顶层 HTML 导航写入

> 日期：2026-11-19　分支：`main`

## 1. 问题

`/dnevend` 的 README 里嵌了三张 ClassyGit 徽章：

```html
<img src="https://classygit.dev/badge/dnevend.svg?theme=mac">
<img src="https://classygit.dev/badge/dnevend.svg?theme=win98">
<img src="https://classygit.dev/badge/dnevend.svg?theme=tui">
```

浏览器每次加载页面都会并发请求它们。middleware 把任何合法 `?theme=` 都当成
访客的显式选择，写入 `classy_theme` cookie（`middleware.ts` 的
`persistTheme`）。三张图片的响应谁最后返回，cookie 就变成谁；下一次刷新
按这个 cookie 渲染，主题看起来就在几套皮肤之间“自动变”。

同样会写 cookie 的还有 `/contrib/<user>.json?theme=...`（贡献墙的客户端
请求）、`/og/*.png?theme=...`、`/card/...`、`/rss.xml?theme=...`。
`?lang=` 也有同样的边界问题。

## 2. 方案

新增 `lib/document-request.ts` 的 `isDocumentNavigation()`：

- 只允许 `GET`；
- 排除 `/api`、`/og`、`/card`、`/contrib`、`/sitemap`、`/robots.txt`、
  `/cursors`、`/fonts`、`/images`、`/badge/<user>.svg`、`/rss.xml`；
- 有 `Sec-Fetch-Dest` 时必须是 `document`（图片是 `image`，fetch 是 `empty`）；
- `Sec-Purpose` / `Purpose` 为 `prefetch` / `prerender` 时也不写；
- 没有 `Sec-Fetch-Dest` 的老客户端要求 `Accept` 含 `text/html`；
- 不按扩展名一刀切，仓库文件页（`.../src/index.ts`、`pom.xml`）在顶层导航
  时仍然可以保存主题。

middleware 的主题 cookie 和语言 cookie 都过这个判断。`?theme=` / `?lang=`
的**渲染**不变，只是子资源请求不再持久化访客偏好。

## 3. 验证

- `scripts/document-request-smoke.ts` 覆盖 badge / OG / contrib / RSS / fetch、
  旧浏览器兜底、仓库文件页带扩展名等情况。
- 本地 `wrangler dev` 对比：
  - 修复前线上 `/badge/octocat.svg?theme=win98`（`Sec-Fetch-Dest: image`）
    返回 `Set-Cookie`；
  - 修复后本地同一请求无 `Set-Cookie`；
  - `/dnevend?theme=tui`（`Sec-Fetch-Dest: document`）仍有 `Set-Cookie`；
  - 仓库文件页 `.../src/index.ts`（document）仍有；
  - badge 图片带 `?lang=zh` 不再写语言 cookie。
- `pnpm --filter @classy/web test` / `check` / `build` 全部通过。
- Playwright：固定 `tui` cookie、拦住 badge 后连续 6 次刷新恒为 `tui`
  （修复前 badge 会改写 cookie）。

## 4. 部署注意

边缘缓存里可能还留着修复前的 badge / contrib 响应（带 `Set-Cookie`）。
部署后清一次 `/badge/*`、`/contrib/*`，或等缓存 TTL 过期；已被污染成
其他主题的访客 cookie 会保留，修复后不会再被子资源改写。
