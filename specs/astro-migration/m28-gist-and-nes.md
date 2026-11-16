# M28 · Gist 标题溢出 / NES 卡片层级

> 日期：2026-11-17　分支：`main`

## 1. 长 Gist 标题

问题出在右侧「最近片段」的 grid 子项：`.gist-list` 的 `min-width: auto`
让列表按标题的 min-content 宽度撑开，标题虽然设了 ellipsis 但没有可收缩空间。

修复：

- `.side-card__gist-list` 增加 `min-width: 0; max-width: 100%`；
- Mac / NES / TUI / Win98 的 gist 标题都设置 `flex: 1; min-width: 0` +
  `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`；
- Gist 详情页 `.page-title` 增加 `overflow-wrap: anywhere; word-break: break-word`，
  超长无空格标题正常换行，不再撑破页面。

完整 Gists 列表仍保留分类和文件数量，只是标题过长时省略。

## 2. NES 卡片层级

之前 README、仓库、资料卡、Now、贡献、最近片段全部是同样的 4px 白边 + 深色底，
卡片一多就像一排相同的白框。现在分三档：

1. **主内容**：README、个人资料卡保持 4px 白色像素边框；
2. **仓库卡**：2px 灰色边框（`#6c757d`），标题改为绿色，hover 变亮绿，
   去掉 `nes-container` 默认 4px 外边距，减少卡片之间的空白；
3. **右侧工具卡**：Now / 贡献 / 最近片段改为 2px `#495057` 边框 +
   `#2b3035` 浅一层的背景，标题绿色，不再使用白色粗边。

同时：

- 仓库网格 gap 16px → 12px；
- 右侧卡片去掉额外的 `margin-top: 4px`，与资料卡保持统一的 16px 间距；
- 保留像素字体、像素按钮和深色背景。

`CACHE_VERSION` 18 → 19。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 四主题注入超长无空格标题：
  - 最近片段标题显示省略号，列表右边界不超出卡片；
  - 完整 Gists 页标题省略；
  - Gist 详情页标题换行，页面无横向滚动。
- NES 视觉检查：README / 资料卡白边，仓库卡灰边绿标题，右侧工具卡浅底绿标题。
- 生产部署（Worker version `4e5a20bb-240d-4ed2-97ae-2c0e1659a49f`）：
  - 四主题注入超长无空格标题后，最近片段仍显示省略号，页面无横向滚动；
  - Gist 详情页标题 `overflow-wrap: anywhere`，长标题换行且无横向滚动；
  - NES README / 资料卡 `4px solid #fff`，仓库卡 `2px solid #6c757d`，
    右侧工具卡 `2px solid #495057` + `#2b3035` 背景，标题均为 `#92cc41`。
- CI run `43929699582` 通过。
