# M33 · 主题化默认 Cover 横幅

> 日期：2026-11-17　分支：`main`

## 行为

`profile.cover` 默认仍是 `null`。没有配置封面的用户不加载任何图片，
改为显示一张由 CSS 生成的主题默认横幅：

- 横幅高度仍为 90px；
- 头像继续覆盖横幅底部，姓名保持底部对齐；
- 有自定义 `cover` 时仍优先显示图片，默认横幅不渲染。

新增共享组件 `ProfileCover.astro`：

```text
profile-cover
  ├─ profile-cover--default   （无自定义封面）
  └─ img                       （有自定义封面）
```

资料卡不再写 `has-cover: !!config.profile.cover`，而是始终带 `has-cover`，
因为默认横幅也参与头像覆盖布局。

## 四主题默认横幅

- **Mac**：浅灰 4px 棋盘格，底部 1px 黑边，System 6 桌面纹理。
- **NES**：深色像素网格 + 绿色像素太阳，底部 4px 白边。
- **TUI**：DOS 蓝扫描线 + 绿色网格，右上角 `C:\CLASSYGIT>` 提示。
- **Win98**：经典 Teal 桌面渐变 + 16px 网格，底部灰色边。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 无配置用户 `octocat`：
  - 四主题都渲染 `profile-cover--default`；
  - 高度 90px；
  - 没有 `<img>` 请求；
  - 头像覆盖横幅、姓名底部对齐。
- 有自定义封面的用户仍加载 `cover.jpg`，`profile-cover--default` 为 false。
- 生产部署与 CI 待补。

`CACHE_VERSION` 23 → 24。
