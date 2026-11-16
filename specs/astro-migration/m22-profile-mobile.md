# M22 · 移动端导航 / TUI 页脚 / 主题鼠标 / 资料卡入口与近况

> 日期：2026-11-16　分支：`main`

## 1. 移动端顶部导航

四个主题的 header 改为单行 flex：

- 导航区 `flex:1 + min-width:0 + overflow-x:auto`，链接不换行、横向滚动；
- 用户名 / 头像 `flex:none`，始终在同一行；
- 用户名过长时省略号；
- 隐藏导航滚动条。

验证（390px，动态追加 6 个导航链接）：
Mac / NES / Win98 / TUI 的 header 仍是一行，用户名与头像 top 差 < 10px，
导航 `scrollWidth > clientWidth` 且 `overflow-x:auto`。

## 2. TUI 页脚可读性

`88×31 badge` 那一行所在 `.community-footer`：

- 主文字 `#fff`；
- 链接 `#55ff55`，hover `#ffff55`；
- hit counter 绿色；
- webring widget 白字。

## 3. 主题鼠标

新增 `/cursors/{mac,win98,tui}-arrow.svg`：

- Mac：白底黑边 System 6 箭头；
- Win98：白色 + 灰色阴影箭头；
- TUI：DOS 绿箭头。

CSS `cursor: url(...) 1 1, default`；`a/button` 保持 pointer，
输入控件保持 auto。

## 4. 资料卡留言簿入口

- `ThemeProfileCardProps.links` 增加可选 `guestbook`；
- 首页在 `config.guestbook.gistId` 存在时传 `/${user}/guestbook`；
- Mac / NES / TUI / Win98 的 ProfileCard 都增加条件按钮。

## 5. 「在读 / 在听 / 在看」

`NowCard` 之前没有接到任何主题，现在接到四套 ProfileCard 的
`ProfileMeta` 下方：

```
READING   江湖边
LISTENING 秘密後院
WATCHING  ...
```

- 空数组不显示对应分组；
- `profile.cardUrl` 有值时也会在 NowCard 里渲染第三方卡片；
- 文案随 `?lang=` / 配置语言切换。

`CACHE_VERSION` 11 → 12。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- Playwright：Mac / TUI 现在卡片显示 江湖边 / 秘密後院；Guestbook 按钮出现在
  actions；TUI badge 计算色 `rgb(85,255,85)`；三套主题 body cursor 指向对应 SVG。
- 生产部署（Worker version `32b7377e-158f-47ca-8798-79cc3c028b50`）：
  390px 下 Mac / NES / Win98 / TUI 追加 6 个导航链接后 header 仍单行，
  导航 `overflow-x:auto`，用户名与头像同 top；
  TUI `88×31 badge` 计算色 `rgb(85,255,85)`；三套 cursor SVG 均 200；
  TUI 显示 Reading 江湖边 / Listening 秘密後院，Guestbook 按钮指向 `/Dnevend/guestbook`。
- CI run `43900693432` 通过。
