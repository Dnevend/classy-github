# M23 · 「近况」独立卡片

> 日期：2026-11-17　分支：`main`

## 原因

M22 把 `NowCard` 接进了各主题的 `ProfileCard`，导致「在读 / 在听 / 在看」
混在个人信息卡片内部，和头像、简介、统计挤在一起。用户要求把它抽成
一张独立卡片，放在个人信息卡片正下方。

## 变更

- `NowCard.astro` 改为独立 `<section class="now-card">`，包含
  `now-card__title` 和 `now-card__body`；
- 四个主题的 `ProfileCard` 移除 `NowCard`；
- 首页 `[user]/index.astro` 在 `.profile__aside-wrap` 内、`<ProfileCard>`
  之后渲染 `<NowCard>`，位于贡献墙之前；
- 基础样式改成卡片容器（边框、圆角、内边距）；
- 四主题单独覆写卡片外观：
  - Mac：System 6 窗口 + 条纹标题栏 + 2px 硬阴影；
  - NES：白色 4px 边框 + 深色面板 + 左上角标题；
  - TUI：DOS 蓝色面板 + 灰色标题栏 + 黑色硬阴影；
  - Win98：银色窗口 + 深蓝渐变标题栏 + 内凹边框；
- `CACHE_VERSION` 12 → 13。

数据与行为保持不变：

- `now.books` / `now.music` / `now.watching`；
- 空数组的分组不渲染；
- `profile.cardUrl` 有值时仍在卡片底部显示第三方统计图；
- 没有近况内容时不渲染卡片。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- Playwright（1280px / 390px，四主题）：
  - 页面只有 1 个 `.now-card`，位于 `.profile__aside-wrap` 内；
  - 前一个兄弟节点是资料卡 `<aside>`，没有嵌在资料卡里；
  - 与资料卡间距 16–20px，与贡献墙间距 16px；
  - 显示 `Reading 江湖边` / `Listening 秘密後院`，空 watching 不显示；
  - 无近况的用户（如 `octocat`）不渲染卡片。
- 生产部署与 CI 待补。
