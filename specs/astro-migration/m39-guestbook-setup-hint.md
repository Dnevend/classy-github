# M39 · 留言簿配置错误提示

> 日期：2026-11-21　分支：`main`

## 背景

线上 `/Cusox/guestbook` 只显示「This guestbook is unavailable right now.」。
根因是 `classy.config.json` 的 `guestbook.gistId` 指向了 Dnevend 的 Gist，
`loadGuestbook` 的归属校验拒绝渲染别人的评论区，但页面没有告诉站主怎么修。

## 行为

留言簿不可用时区分两类原因：

| 情况 | 判定 | 页面 |
|---|---|---|
| Gist 404（不存在 / 已删除 / 匿名不可见） | 配置错误 | 提示 + 配置页链接 |
| Gist 非 public | 配置错误 | 提示 + 配置页链接 |
| Gist owner 不是当前用户 | 配置错误 | 提示 + 配置页链接 |
| GitHub 限流、网络、5xx | 临时不可用 | 保留「暂时不可用」 |
| 评论接口失败 | 临时不可用 | 保留「暂时不可用」 |
| 未配置 `guestbook.gistId` | 未启用 | 保留「还没有开留言簿」 |

配置错误时链接到 `/setup?u=<用户名>#guestbook`，直达配置生成器的
留言簿字段；`#guestbook` 使用 `scroll-margin-top` 避免被吸顶导航挡住。

文案（中）：`这个留言簿的 Gist ID 配置有误。如果你是站主，请确认它指向你自己创建的公开 Gist。`
动作：`去配置页修改 →`

## 改动

- `apps/web/src/lib/guestbook.ts`：`GuestbookData` 增加 `gistMisconfigured`；
  REST 和 GraphQL 两条路径都用 `isNotFound` 区分 404 与临时故障，
  `validGist` 拒绝非公开 / 非本人 Gist 时同样标记配置错误。
- `apps/web/src/pages/[user]/guestbook.astro`：配置错误时渲染提示和配置页链接。
- `apps/web/src/lib/i18n.ts`：新增 `guestbook.misconfigured`、
  `guestbook.configure` 中英文案。
- `apps/web/src/pages/setup.astro`：社区配置 section 增加 `id="guestbook"`。
- `apps/web/src/styles/global.css`：`.guestbook__notice` 布局与
  `#guestbook` 的滚动偏移。
- `apps/web/src/middleware.ts`：`CACHE_VERSION` 46 → 47，旧版本保留 stale 回退。

## 验证

- `astro check`、`pnpm test`、`astro build`。
- 本地 dev：
  - `/Cusox/guestbook`：显示新提示，链接为 `/setup?u=Cusox#guestbook`；
  - `/Cusox/guestbook?lang=zh`：显示中文文案；
  - `/Dnevend/guestbook`：正常渲染留言列表，无配置提示；
  - 未启用留言簿的用户：仍显示「还没有开留言簿」；
  - `/setup?u=Cusox#guestbook`：锚点定位到留言簿字段。
