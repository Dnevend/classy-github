# M31 · NES / TUI 封面姓名重叠

> 日期：2026-11-17　分支：`main`

## 问题

M30 让有封面时姓名块底部对齐头像。NES / TUI 的像素字体行高更大
（NES 24px、TUI 25.2px），姓名块比 Mac / Win98 高；头像与封面重叠 34px
时，姓名第一行会压到封面底部，看起来像文字和封面/头像重叠。

## 修复

只调整 NES / TUI 的头像重叠量：

- NES：`.nes-profile.has-cover` 的 `margin-top` 从 `-34px` 改为 `-12px`；
- TUI：`.tui-profile.has-cover` 的 `margin-top` 从 `-34px` 改为 `-22px`
  （TUI body 自身有 10px 内边距）。

效果：

- 头像仍然覆盖封面 12px，保留层次；
- 姓名 + `@handle` 完整落在封面下方；
- 姓名块底部仍与头像底部对齐；
- 名字和 handle 之间不重叠。

`CACHE_VERSION` 21 → 22。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- NES：封面 bottom 237，姓名 top 243，姓名完全在封面下方；头像重叠 12px。
- TUI：封面 bottom 184，姓名 top 184，正好从封面下方开始；头像重叠 12px。
- 两者姓名 bottom 与头像 bottom 均为 0px 差。
- 生产部署与 CI 待补。
