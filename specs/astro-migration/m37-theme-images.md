# M37 · GitHub 主题变体图片

> 日期：2026-11-18　分支：`main`　Issue：#2

## 问题

`/Eternal-Wanderer-Vegetable` 的 README 用 GitHub 的深浅色变体图片：

```html
<img src="./assets/banner-light.svg#gh-light-mode-only">
<img src="./assets/banner-dark.svg#gh-dark-mode-only">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./light.svg">
  <img src="./fallback.png">
</picture>
```

GitHub 会按自己的外观只显示一张；ClassyGit 的 Markdown 管线不认识这两种写法，
两张图会同时输出。实测（旧管线）：

```html
<img src="https://raw.githubusercontent.com/.../banner-light.svg#gh-light-mode-only">
<img src="https://raw.githubusercontent.com/.../banner-dark.svg#gh-dark-mode-only">
<p><picture>...<img src=".../fallback.png"></picture></p>
```

`<picture>` 的 `srcset` 还是相对路径，浏览器按访客系统的偏好选中深色图时直接碎图。

## 语义

本站背景由主题决定，不能跟随访客系统的 `prefers-color-scheme`：
mac / win98 是白底，nes / tui 是深底。服务端按**当前主题的 color-scheme**
挑一版，只输出一张图。

| 主题 | `theme.css` 的 color-scheme | README 图片 |
|---|---|---|
| `mac` | light | `#gh-light-mode-only` / light source |
| `win98` | light | 同上 |
| `nes` | dark | `#gh-dark-mode-only` / dark source |
| `tui` | dark | 同上 |

映射在 `lib/theme.ts` 的 `THEME_COLOR_SCHEMES`，必须与各主题 `theme.css` 保持一致。
主题切换本身是一次导航，HTML 缓存键已经带 theme（`middleware.ts`），
所以不同主题各自缓存，不存在串味。

## 管线

新增 `lib/theme-images.ts`，提供 rehype 插件 `rehypeThemeImages({ colorScheme })`：

```text
rehype-raw → rehype-sanitize → rehype-theme-images → 标题锚点 → rehypeFixUrls → shiki
```

插件必须在 sanitize 之后（节点与属性已过白名单），在 fixUrls 之前
（`<picture>` 折叠出的 `<img src>` 还要走相对路径改写）。

## 行为

| 输入 | 输出 |
|---|---|
| `img src` 带 `#gh-<当前配色>-mode-only` | 去掉片段，保留 |
| `img src` 带另一种配色的片段 | 整个 `<img>` 删除 |
| 删除后 `<p>` / `<a>` 只剩空白/注释 | 连包装一起删，避免空行 |
| `<picture>` 含 `prefers-color-scheme` source | 折叠成一张普通 `<img>`：优先匹配当前配色的 `srcset` 首个 URL，否则用兜底 `<img>`；`alt/width/height/align/class` 从兜底图继承 |
| `<picture>` 不含 color-scheme（纯响应式） | `<picture>` 保留，交给浏览器；里面的兜底 `<img src>` 若带主题片段仍按配色处理 |
| `<picture>` 里没有任何可用 URL（source 全被过滤且无兜底图） | 整个 `<picture>` 删除 |

`<source media>` 里的其它条件（例如 `and (min-width: 800px)`）无法在服务端求值，
只识别 `prefers-color-scheme`；主题变体场景下这已经足够。

只处理 `<img>` / `<picture>`，不处理 `<a href>` 上的片段（GitHub 本身也只对图片生效）。

## 调用方

`renderMarkdown` 新增 `colorScheme?: 'light' | 'dark'`（默认 `light`，与默认的
mac 主题一致）。个人主页 README、仓库 README、仓库文件页 Markdown、Gist 文件
都传 `themeColorScheme(themeName)`；留言簿关闭图片，不传。

## 缓存

部署时把 `CACHE_VERSION` 升到 39（线上当前为 38），旧 key 的双图 HTML 立即失效；
`PREVIOUS_CACHE_VERSIONS` 改为 `['38', '37', '36']` 作为 stale 兜底。

## 验证

`apps/web/scripts/markdown-smoke.ts` 新增断言：

- light / dark 各自只保留对应图片，输出里不再出现 `#gh-*-mode-only`；
- `<picture>` 折叠成单个 `<img>`，相对 `srcset` 被补成绝对地址；
- 只有 dark source 时 light 主题退回兜底图；没有任何可用 URL 时整段删除；
- 纯响应式 `<picture>` 保持 `<picture>` 结构，里面的兜底 `<img>` 仍按配色处理；
- `javascript:` / `vbscript:` / `file:` 不会被从 `srcset` 提升为 `img src`；
- 只含主题图片的 `<a>` 被清理。

`scripts/theme-smoke.ts` 断言 `THEME_COLOR_SCHEMES` 与四套 `theme.css` 的
`color-scheme` 一致，防止以后改配色时漏改映射。

另跑 `pnpm check`（0 error）与 `pnpm test`（含 markdown / theme smoke）。
