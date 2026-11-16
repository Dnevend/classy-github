# M25 · 最近 Gists / 右侧卡片统一 / 配置与主题清理

> 日期：2026-11-17　分支：`main`

## 1. 主页最近 Gists

用户主页右栏在贡献活跃度卡片下方新增「Recent gists」：

- 数据来自 `listGists(user, showCount)`；
- 默认 6 条，`profile.gists.showCount` 控制数量；
- `profile.gists.visible` 为 `false` 时不请求、不渲染；
- 没有公开 Gist 时整块不渲染；
- 复用各主题的 `GistCard`，标题/分类来自 `classy.<type>.<title>` 规则；
- Gist API 失败时只隐藏这块，不影响主页其余内容。

## 2. 贡献活跃度卡片统一

新增共享 `SideCard.astro`：

```text
<section class="side-card">
  <h2 class="side-card__title">…</h2>
  <div class="side-card__body"><slot /></div>
</section>
```

贡献墙和最近 Gists 都用它。四主题分别覆写：

- Mac：System 6 窗口 + 条纹标题栏 + 2px 硬阴影；
- NES：4px 白边深色面板 + 左上角标题；
- TUI：DOS 蓝面板 + 灰色标题栏 + 6px 黑阴影；
- Win98：银色窗口 + 深蓝渐变标题栏 + 内凹边框。

同时删除旧的 `.contrib` 主题样式，避免双重边框。

## 3. 新增配置

```json
"profile": {
  "repos": { "visible": true, "showCount": 6 },
  "gists": { "visible": true, "showCount": 6 }
}
```

- `profile.repos.visible`：主页是否显示仓库区（原有字段，本次接进 `/setup`）；
- `profile.repos.showCount`：最近仓库数（原有）；
- `profile.gists.visible`：主页是否显示最近 Gists；
- `profile.gists.showCount`：最近 Gists 数量，默认 6，范围 0–100。

`/setup` 增加「显示仓库 / 显示 Gists / 最近 Gists 数」；生成器 JSON 同步输出
`profile.gists`。

## 4. 首页 hero-links 间距

`.hero p` 的 `margin: 0 0 28px` 特异性高于 `.hero-links`，原 `margin-top: 26px`
被吃掉。选择器改为 `.hero .hero-links`，搜索框与 hero-links 间距恢复 26px。

## 5. 移除 default 主题

- 删除 `apps/web/src/themes/default/` 整个目录；
- `ThemeName` / `THEME_NAMES` 只保留 `nes | mac | win98 | tui`；
- `parseThemeName` 继续兼容旧名字：
  - `default` → `mac`
  - `win95` → `win98`
- 删除 `theme-palette` 和贡献图里的 default 调色板；
- `Base` 的 theme 默认值改为 `mac`；
- 删除页面里的 `config.theme === 'default'` 兼容分支；
- README 主题表、配置示例、目录树同步更新。

`CACHE_VERSION` 15 → 16。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 四主题桌面 + 390px 移动端：
  - 贡献卡片和最近 Gists 卡片在资料卡/近况下方，Gists 在贡献卡片正下方；
  - 每主题显示 6 条 Gist；
  - 卡片标题、边框、阴影与同主题其他卡片一致；
  - 无横向溢出。
- `/setup`：显示仓库/Gists 开关与数量；JSON 含 `profile.gists`。
- 首页搜索框与 hero-links 间距 26px。
- `?theme=default` 落到 `mac`，不再加载 default 主题代码。
- 生产部署（Worker version `ba621419-9de7-45a8-89b6-e0803159dbb3`）：
  - 四主题右栏顺序均为 资料卡 → Now → Contribution → Recent gists；
  - 每主题 6 条 Gist，卡片样式与同主题其他卡片一致；
  - `/github` 无公开 Gist，Recent gists 整块不渲染；
  - `/setup` 的 5 个复选框全部可见，`profile.gists` 正确输出；
  - `?theme=default` 实际渲染 `data-theme="mac"`。
- CI run `43917702433` 通过。
