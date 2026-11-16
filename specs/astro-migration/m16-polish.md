# M16 · 首页最近访问 / 详情页统计样式 / 小交互修复

> 日期：2026-11-16　分支：`main`

## 范围

1. `/setup` 留言簿提示增加「创建 Gist」链接，带 `?filename=guestbook.md`。
2. Gists 页 Archive / RSS / 搜索合并到右侧 `.list-actions` 组。
3. 首页增加「最近访问」：用户页访问记录存 `localStorage`，首页展示、可清除。
4. Mac 主题顶栏 `ClassyGit` 从 `<span>` 改为 `<a href="/">`，可回首页。
5. Mac / TUI 资料卡统计改成 2×2 网格：
   - Mac：黑底白格、20px 数字、10px 大写标签；
   - TUI：白线网格、绿色数字、10px 大写标签。

## 实现

- `Base.astro` 接收 `user` / `userName`，写到 `<body data-classy-user data-classy-name>`；
  内联脚本只在路径第一段等于当前 login 且不属于 setup/webring/badge/claim/api/og/random
  时记录 `{ login, name, at }` 到 `classy:recent`（最多 8 条，大小写不敏感去重）。
- `RecentVisits.astro` 首页读 localStorage，只用 `textContent` 渲染，头像由 login 重新拼；
  支持清除和 `storage` 事件跨标签页更新。
- `gists.astro` 把 Archive / RSS / ListSearch 放进 `.list-actions`；
  移动端整组换行、搜索框拉满。
- Mac `ProfileCard` / TUI `ProfileCard` 用 stats 数组 + CSS grid；
  隐藏 followers/following 时最后一格自动跨两列。
- `CACHE_VERSION` 5 → 6（HTML 结构变了）。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test` 通过。
- Playwright：
  - `/Dnevend` → 记录 localStorage；`/` 的 `#recent-visits` 显示 Dnevend；
  - Clear 后列表清空；
  - `/setup?u=Dnevend` 的 Gist 链接 = `https://gist.github.com/?filename=guestbook.md`；
  - `/Dnevend/gists` 的 `.list-actions` = archive / rss / search，右对齐；
  - Mac `a.mac-appname.href = "/"`，stats 四格；TUI stats 四格。
- 桌面截图：Mac / TUI 统计卡、首页最近访问、Gists 头部。
- 生产部署（Worker version `724e500a-944e-4afd-9b83-0e5e1610bd81`）：
  `a.mac-appname.href="/"`；Mac 四格 / TUI 四格统计；
  `/Dnevend/gists` 的 `.list-actions` 含 archive / rss / search；
  setup 的 Gist 链接 = `https://gist.github.com/?filename=guestbook.md`；
  pages.dev 上先访问 `/Dnevend` 再回 `/`，`#recent-visits` 显示 Dnevend，头像加载成功。
- CI run `43879491654`、`43879566112` 通过。

## 已知限制

- 最近访问只在同一 origin 的 localStorage 生效；清浏览器数据即丢失。
- 记录只覆盖用户主页/列表/详情，不记录 setup/badge/claim 等工具页。
- Mac 右上角仍是用户显示名（回个人主页）；左上角 `ClassyGit` 才是回首页。
