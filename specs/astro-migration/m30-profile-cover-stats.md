# M30 · 封面头像对齐 / 资料卡统计样式

> 日期：2026-11-17　分支：`main`

## 1. 有封面时名字底部对齐头像

四主题资料卡在 `.has-cover` 状态下把 `.mac-profile` / `.nes-profile` /
`.tui-profile` / `.w95-profile` 的 `align-items` 改为 `flex-end`：

- 头像保持覆盖封面底部；
- 名字 + `@handle` 文本块底部与头像底部对齐；
- 没有封面时仍保持垂直居中。

## 2. 统计区上边距

四主题的 followers / following / repos / gists 统计都加了顶部间距：

- Mac：`margin: 14px 0 12px`；
- NES：`margin: 14px 0 14px`；
- TUI：`margin: 14px 0 12px`；
- Win98：`margin: 14px 0 10px`。

## 3. 各主题统计样式

- **Mac**：保留 2×2 边框表格，数位更大、标签全大写；只调整间距。
- **NES**：每个统计变成独立像素小格：1px `#495057` 边框、深色底，
  数字绿色加粗，标签右对齐，2×2 排列。
- **TUI**：保留白边 2×2 表格，绿色大数字；增加顶部间距。
- **Win98**：`stats` fieldset 内改为无项目符号的 2×2 网格，
  数值用深蓝加粗，标签普通字号；去掉原来的单列项目符号列表。

`CACHE_VERSION` 20 → 21。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 四主题资料卡无封面时：统计区与上方 meta 有 14px 间距，布局正常。
- 封面 DOM 注入后：姓名块 bottom 与头像 bottom 差值 0px（四主题）。
- Win98 统计为 2×2 网格，数值/标签左对齐；NES 统计为 2×2 像素小格。
- 生产部署与 CI 待补。
