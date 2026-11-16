# M26 · 贡献卡片开关 / 顺序 / 资料卡按钮清理

> 日期：2026-11-17　分支：`main`

## 1. 中文文案

`gists.recent` 的中文从「最近 Gist」改为「最近片段」；
`/setup` 里的「显示 Gists / 最近 Gists 数」同步改为「显示片段 / 最近片段数」。

## 2. 贡献活跃度开关与顺序

新增配置：

```json
"profile": {
  "contrib": { "visible": true }
}
```

- 默认 `true`；
- 为 `false` 时不渲染贡献卡片；
- 默认顺序改为：资料卡 → 贡献活跃度 → 近况 → 最近片段。

`/setup` 的个人资料区块增加「显示贡献活跃度」复选框。

## 3. 移除资料卡按钮

四主题资料卡里的四个按钮全部删除：

- 仓库
- 片段
- 留言簿
- GitHub

同时删除 `ThemeProfileCardProps.links`、页面传参、以及
`.mac-actions` / `.nes-actions` / `.tui-actions` / `.w95-actions` 样式。
资料卡现在只保留头像、名字、简介、元信息和统计。

`CACHE_VERSION` 16 → 17。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 四主题中文主页：
  - 顺序为 资料卡 → 贡献活跃度 → 近况 → 最近片段；
  - 资料卡内不再出现仓库/片段/留言簿/GitHub 按钮；
  - 标题显示「贡献活跃度 / 近况 / 最近片段」。
- `/setup`：6 个复选框全部可见，JSON 输出 `profile.contrib.visible`。
- 生产部署与 CI 待补。
