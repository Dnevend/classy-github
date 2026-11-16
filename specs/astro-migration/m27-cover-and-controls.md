# M27 · 最近片段精简 / 封面图 / 卡片按钮差异化

> 日期：2026-11-17　分支：`main`

## 1. 最近片段只显示标题和日期

`GistCard` 新增 `compact` 参数，主页「最近片段」传 `compact`：

- 不显示分类标签；
- 不显示文件数量；
- 保留标题和日期。

`/<user>/gists` 列表仍显示分类和文件数量。

## 2. profile.cover 封面图

配置：

```json
"profile": {
  "cover": "https://example.com/cover.jpg"
}
```

- `/setup` 资料卡区块新增「封面图 URL」输入框；
- 生成器只接受 http(s)，非法值输出 `null`；
- 主页资料卡在头像上方渲染全宽封面，高 90px，`object-fit: cover`；
- 头像负边距上移，覆盖封面底部，形成层次：
  - Mac：白边 + 黑色描边；
  - NES：白色像素边框；
  - TUI：绿色边框；
  - Win98：白边 + 黑色描边。

## 3. 卡片按钮差异化

四主题统一规则：

| 卡片 | 按钮 |
|---|---|
| 仓库卡片 | 无右上角按钮 |
| README 卡片 | 最小化 / 最大化 / 关闭 |
| 个人信息卡片 | 问号按钮 |

各主题实现：

- **Win98**：仓库卡删除 `title-bar-controls`；README 使用 98.css 的
  Minimize / Maximize / Close；资料卡只用 `aria-label="Help"` 问号按钮。
- **Mac**：仓库卡删除左上角关闭框；README 用左侧 `×` + 右侧 `−` / `□`
  三个方块；资料卡右上角 `?` 方块。
- **NES**：仓库卡无控件；README 容器加标题和 `− □ ×` 像素按钮；
  资料卡标题右侧 `?` 像素按钮。
- **TUI**：仓库卡无控件；README 标题栏右侧 `[-] [□] [X]`；
  资料卡标题栏右侧 `[?]`。

`CACHE_VERSION` 17 → 18。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 四主题：
  - 最近片段只显示标题 + 日期；
  - 仓库卡无窗口按钮；
  - README 卡有三个窗口按钮；
  - 资料卡有问号按钮；
  - 封面通过 DOM 注入验证：宽度贴合卡片、头像覆盖封面 22–34px。
- `/setup`：封面输入框可写，JSON 输出 `cover`，非法 URL 输出 `null`。
- 生产部署与 CI 待补。
