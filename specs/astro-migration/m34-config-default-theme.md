# M34 · `classy.config.json` 的 `theme` 成为访客默认主题

> 日期：2026-11-17　分支：`main`

## 1. 问题

`theme` 之前只被两处使用：

- `seoForProfile({ defaultTheme: config.theme })`：判断哪个主题可索引；
- `syncSite({ theme: config.theme })`：网站环目录展示。

但 middleware 的 `resolveThemeChoice()` 固定回退到 `mac`，访客首次访问
`/<user>` 时永远先看到 mac。结果：

- 配置 `theme: "nes"` 的用户，访客默认看到 mac；
- `seo.index: true` 时，`/<user>` 实际渲染 mac、`theme !== config.theme`，输出
  `noindex`，但 sitemap 仍收录该用户；
- `/webring` 显示 nes，点进去却是 mac。

## 2. 方案

主题解析优先级改为：

```text
?theme= > cookie > 站主配置的 theme > mac
```

middleware 在计算缓存键之前，对没有显式主题选择的用户页读一次配置：

1. `userFromPath(pathname)` 判断是不是用户页，排除 `/setup`、`/badge`、
   `/og`、`/api`、静态资源、`rss.xml` 等（先 decode 再判断保留字）；
2. `loadConfigState(user)` 读取配置（走现有边缘缓存）；
3. 把 `config.theme` 作为 `resolveThemeChoice()` 的 fallback；
4. 缓存键使用最终主题，避免 NES HTML 被缓存到 mac 条目；
5. 配置读取失败时回退 `mac`，不阻塞页面。

middleware 另外用 `https://classy.cache/theme/<login>` 缓存 5 分钟的“站主默认主题”。
这样没有 `classy-github` 仓库的用户在 HTML 缓存命中时不会每次都打一次 GitHub API；
`reliable=false`（网络/限流）时不写这个缓存，避免把 mac 当成“没有配置”固定 5 分钟。
主题缓存与配置缓存分离，页面仍用 `loadConfigState` 判断 claim / 网站环，不受主题缓存影响。

## 3. 边界

- `?theme=` / cookie 仍然最优先，访客显式选择不会被站主默认主题覆盖；
- `/Dnevend/rss.xml` 等非 HTML 路径不读配置；
- `/setup`、`/%73etup`、`/webring`、`/badge`、`/og`、`/api`、`/cursors/...`
  等入口继续用 mac；
- 配置读取失败或 404 时回退 mac。

## 4. 验证

```text
pnpm --filter @classy/web test   → markdown 13 + config 20 + community 13 全过
pnpm --filter @classy/web check  → 0 errors, 0 warnings, 9 hints
pnpm --filter @classy/web build  → Complete
```

`config-smoke` 新增 `resolveRequestTheme()` stub 用例：配置默认主题进入 fallback、
显式 `?theme=`/cookie 和非用户页不调用加载器、加载失败回退 mac、preview 传 fresh。

本地 dev 端到端：

```text
GET /Dnevend                      → data-theme="mac"（Dnevend 配置 theme=mac）
GET /Dnevend?theme=nes            → data-theme="nes"
GET /Dnevend + Cookie win98       → data-theme="win98"
GET /octocat                      → data-theme="mac"（无配置，回退 mac）
GET /Dnevend/rss.xml              → Atom，正常
GET /setup                        → data-theme="mac"
GET /badge/Dnevend                → data-theme="mac"
```

Worker 本地缓存验证（wrangler dev）：

```text
/Dnevend   首次 2360ms → 第二次 7ms / cache HIT
/octocat   首次 3179ms → 第二次 7ms / cache HIT   （无 classy-github 仓库）
```

当前 GitHub 上只有 Dnevend 一份 `classy.config.json`（theme=mac），所以
“非 mac 配置默认主题”的完整端到端场景由 `resolveRequestTheme()` +
`resolveThemeChoice({ fallback: 'nes' })` + `userFromPath()` 单测覆盖；
有第二份非 mac 配置后可补一次真实页面验证。
