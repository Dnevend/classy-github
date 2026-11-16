# ClassyGit → Astro 迁移计划书

> 状态：草案（M0 已落地，M1 起待执行）
> 分支：`v2`（长期集成分支，全部完成后合入 `main`）
> 最后更新：2026-11-15

**已确认决策**（2026-11-15，来自项目 owner）：

1. 生产环境无人在用 → **API 代理直接下线**，不做修复部署（`classy-api.dnevend.workers.dev` 已删除）。
2. 主题采用 **`?theme=`** 形式，不做子域名、不做路径前缀。
3. Cloudflare 已开通 **$5/月 Workers Paid**（30s CPU/请求）→ Shiki 渲染不设 CPU 顾虑，§8 的 CPU 风险解除。

---

## 1. 背景与目标

### 现状

- 前端是 Vite + React 18 的纯客户端 SPA（`apps/classy`、`apps/nes` 两个复制品）。
- 数据来自 GitHub 公共 API，浏览器直连（60 次/小时/IP）。
- 自建 Worker 代理已于 2026-11-15 下线（`classy-api.dnevend.workers.dev` 已删除，访问返回 `error code: 1042`）。
- 用户配置从被访问者自己 fork 的仓库里读：`raw.githubusercontent.com/<user>/classy-github/main/classy.config.json`。
- 部署在 Cloudflare Pages（`classy-github.pages.dev`），原域名 `classygit.me` 已失效。

### 这次重构要解决的问题（按优先级）

| # | 问题 | 现状证据 | 目标 |
|---|---|---|---|
| P0 | SEO 为零 | `index.html` 里没有 title/description/OG，内容全靠 JS 注入 | 服务端直出完整 HTML + OG + JSON-LD |
| P0 | 首屏 = 空白 + 骨架屏 | 空 `#root` | HTML 里就有内容 |
| P1 | 匿名限流 60 次/小时 | 实测 `x-ratelimit-limit: 60`，且代理出口 IP 池里已有被打满的 IP | 服务端 token（5000/h）+ 边缘缓存 |
| P1 | 失败静默 | 任何失败都 `return alt` → 空列表 | 明确错误态 + 404 |
| P2 | 主题靠复制 app + 子域名 | `apps/nes` 是 `apps/classy` 的复制品 | 一套数据层 + N 套主题组件 |
| P2 | 外部输入无信任边界 | README 走 `rehype-raw` 无 sanitize；config 无校验 | sanitize + zod |

### 非目标（这次不做）

- 不做登录 / 不做网页版配置后台（见 §9 开放问题 Q4）。
- 不做评论、点赞、搜索。
- 不迁移 `docs/`（Docusaurus）——它是没改过的模板，M5 直接删或重写。
- 不改 Gist 内容模型（`classy.<type>.<title>` 这套约定继续用）。

---

## 2. 决策记录

### D1：框架选 Astro（而非 Next / React Router）

评估时的关键事实：**页面集合是无限的**（任意 GitHub 用户名）、**内容随时变化**、**没有构建触发点**（别人改配置不会触发 rebuild）。因此不存在「构建期静态生成」的选项，只能是「服务端按需渲染 + 边缘缓存」。

| | Astro 7 + `@astrojs/cloudflare` | Next 16 + `@opennextjs/cloudflare` | React Router 8 + `@react-router/cloudflare` |
|---|---|---|---|
| 按需渲染 | `output:'server'` 或单路由 `prerender=false` | App Router SSR | loader SSR |
| ISR 等价物 | `Cache-Control` + `caches.default`（约 20 行） | KV 增量缓存、D1 tag 缓存、DO 队列、purge、rclone 预热 | 自己写 |
| 客户端 JS | 默认 0 | React runtime + RSC payload | React runtime |
| 主题为纯 CSS 库时（NES/system.css） | 零 JS 完整还原 | 必须带 React | 必须带 React |
| 迁移成本 | 3–5 天 | 1–2 周 | 2–3 天 |

选 Astro 的四条理由：

1. **内容站形态**：5 条路由，90% 输出是文本，交互只有主题开关、抽屉、Tab、分页 → 岛屿架构正合适。
2. **能删掉客户端最大的体积炸弹**：语法高亮从 `react-syntax-highlighter`（全语言入口，~1MB）搬到服务端 Shiki。
3. **安全顺带修好**：Markdown 在服务端渲染 + sanitize，客户端不再处理用户可控 HTML。
4. **CF 原生**：`@astrojs/cloudflare` 是官方适配；OpenNext 虽然也活跃（v1.20.x），但要为「三分钟缓存」这种需求维护一整套增量缓存基础设施，不划算。

**翻转条件**：若半年内要做「登录 GitHub + 网页改配置」的后台，则 Next 更合适（App Router + server actions + Auth.js）。届时主题仍可用 `[theme]` 段路由实现。

### D2：多主题 = 一套数据层 + N 套主题组件，不用多 app / 多子域名

四套主题（default / nes / mac / win95）的 **DOM 结构不同**，不是纯换色。因此：

- 主题是 **URL 维度 + 服务端决定**，不能用 cookie/localStorage 在浏览器切换。
- 用 `?theme=nes`，而不是 `nes.classygit.me`（后者割裂权重、4 份证书、4 次部署）。
- 每套主题是一个目录，通过契约（5 个组件槽位）接入；**主题里不允许出现取数、SEO、路由、配置解析**。

详见 `theme-contract.md`。

### D3：删掉独立的 API 代理（已执行）

服务端渲染后，GitHub 请求全部由 Astro Worker 发出，带 token，浏览器不再直连 API。因此 `packages/service` 的历史使命结束。

- **2026-11-15 已执行**：删除线上 worker `classy-api`（确认返回 `error code: 1042`），并删除 `packages/service` 与 `githubUrl.proxyApi`、`gitApiFetch` 的代理回退分支。
- M0 曾给该 worker 补过缓存与路径白名单，本地 miniflare 验证通过（MISS→HIT、非白名单 403），但既然生产无人在用，就不做部署，直接下线——少一个需要维护的公开端点。
- M1 之后若仍需给「加载更多」这类交互留接口，在 Astro 里用 `src/pages/api/gh/[...path].ts`，同样带 token + 边缘缓存。

### D4：SEO 分层，而不是全站索引

见 §6。

---

## 3. 目标架构

```
apps/web/                          # 新建，替代 apps/classy + apps/nes
  astro.config.mjs
  wrangler.jsonc
  src/
    pages/
      index.astro                  # 落地页
      404.astro
      robots.txt.ts
      sitemap.xml.ts               # 动态 sitemap（读 KV 用户表）
      [user]/
        index.astro                # 个人主页
        repos.astro
        repo/[repo].astro
        gists.astro
        gist/[id].astro
      api/gh/[...path].ts          # 可选，替代旧代理
    layouts/
      Base.astro                   # <html>/<head>/SEO，主题无关
    components/
      Seo.astro                    # title/OG/canonical/JSON-LD
    themes/
      types.ts                     # 契约
      index.ts                     # 注册表 + resolveTheme
      _shared/                     # 跨主题：ThemeSwitcher、Pagination、Empty
      default/  nes/  mac/  win95/
    lib/
      github.ts                    # 带 token + 边缘缓存的 fetch
      config.ts                    # 读取 + zod 校验 + 深合并
      gist-rule.ts                 # matchGistRule / getGistMatchStr
      markdown.ts                  # unified 管线（sanitize + shiki）
      seo.ts                       # 索引策略、JSON-LD 构造
      users-kv.ts                  # 用户注册表（sitemap 用）
    middleware.ts                  # 缓存头 + Cache API + 404 归一
packages/
  shared/  types/                  # 保留（常量、类型）
  components/                      # 逐步删除（被 themes/ 取代）
  lib/                             # 保留纯函数部分，其余搬进 apps/web/src/lib
                                   # （service/ 已于 2026-11-15 删除）
```

### 数据流

```
请求 /Dnevend
  ↓ middleware：查 caches.default（key = 规范化 URL）
  命中 → 直接返回缓存的 HTML（CF 边缘，0 CPU）
  未命中 ↓
  ↓ 页面：ghFetch('/users/Dnevend') → Cache API（300s）→ api.github.com（带 token）
  ↓ 页面：loadConfig('Dnevend')   → Cache API（300s）→ raw.githubusercontent.com
  ↓ 页面：markdown → sanitize → shiki → HTML
  ↓ 渲染 theme.components.Layout
  ↓ middleware：Cache-Control: s-maxage=300 + caches.default.put
```

### 缓存策略

| 资源 | 位置 | TTL | 说明 |
|---|---|---|---|
| API 响应 | `caches.default` | 300s | 键 = 完整 URL；只缓存 `res.ok` |
| 用户配置 | `caches.default` | 300s | 修掉「改了配置永远不生效」 |
| 主页 HTML | `caches.default` | 300s + SWR 1h | 键含 `theme` / `page` |
| 文章 HTML | `caches.default` | 3600s + SWR 1d | Gist 改动频率低 |
| 404 | 不缓存 | — | 避免一个错拼的用户名被缓存 |

### 鉴权与配额

- `GITHUB_TOKEN`：fine-grained PAT，只勾 public repo 只读；通过 `wrangler secret put` 注入。
- 5000 次/小时，比现在匿名 60 次/小时高两个数量级，且不再受「CF 出口 IP 被别人打满」影响。
- token 只出现在服务端，绝不进客户端 bundle。

---

## 4. 路由映射

| 现有（React） | 新（Astro） | 渲染 | 索引 | 缓存 |
|---|---|---|---|---|
| `apps/classy/src/App.tsx` | `pages/index.astro` | 预渲染 | 是 | 静态 |
| `pages/user/index.tsx` | `pages/[user]/index.astro` | 按需 | 视配置（默认 noindex） | 300s |
| `pages/repos/index.tsx` | `pages/[user]/repos.astro` | 按需 | noindex,follow | 300s |
| `pages/repo.tsx` | `pages/[user]/repo/[repo].astro` | 按需 | noindex,follow | 300s |
| `pages/gists/index.tsx` | `pages/[user]/gists.astro` | 按需 | noindex,follow | 300s |
| `pages/gist.tsx` | `pages/[user]/gist/[id].astro` | 按需 | **是**（Article） | 3600s |
| `router/index.tsx` 的 `<>Error</>` | `pages/404.astro`（真 404 状态） | — | — | 不缓存 |

### 文件级迁移清单

| 现在 | 去处 | 处理方式 |
|---|---|---|
| `packages/lib/request/index.ts` | `src/lib/github.ts` | 加 token、Cache API、去掉 `alt` 静默失败 |
| `packages/lib/hooks/useClassyConfig.ts` | `src/lib/config.ts` | 加 zod 校验 + 深合并 + TTL + 支持 `master` |
| `packages/lib/utils/index.ts`（gist 两条） | `src/lib/gist-rule.ts` | 原样搬，补 `prefix` 的转义 |
| `packages/lib/cache`（store2） | 删除 | 服务端缓存取代客户端缓存 |
| `packages/lib/hooks/usePageFetch.ts` | `_shared/Pagination.astro` | 改成 query param 分页，服务端渲染 |
| `packages/components/MarkdownPreview` | `src/lib/markdown.ts` | 换成 unified + sanitize + shiki |
| `packages/components/CodeRender` | 删除 | Shiki 在服务端出静态 HTML |
| `packages/shared/constants` | 保留 | 域名/代理常量随 M5 精简 |
| `packages/types/github.d.ts` | 保留 | 后续可用 `@octokit/openapi-types` 替代手写类型 |
| `apps/classy/src/components/ui/*` | `themes/default/ui/*` | shadcn 组件只在 default 主题用 |
| `apps/nes/**` | `themes/nes/**` | 只保留 CSS 与 markup 结构，见 `theme-contract.md` 附录 |
| `apps/classy/src/hooks/useThemeMode.ts` | `src/lib/theme-mode.ts` | 暗/亮模式与「主题」解耦 |

---

## 5. Markdown 管线（P2 安全 + 体积）

README 和 Gist 是**任意外部内容**，必须在服务端处理完再输出 HTML。

```
remark-parse
  → remark-gfm                 # 表格、任务列表
  → remark-rehype { allowDangerousHtml: true }
  → rehype-raw                 # GitHub README 大量用原始 HTML（<p align>, <img>）
  → rehype-sanitize            # 关键：白名单，默认 schema 已是 GitHub 风格
  → @shikijs/rehype            # 服务端高亮，产出静态 HTML
  → rehype-slug + rehype-autolink-headings
  → rehype-stringify
```

三个硬约束：

1. **先 sanitize 再高亮**。否则高亮插件生成的 `class`/`style` 会被 sanitize 清掉。
2. sanitize 的 schema 要显式放行 `img[src]` 的 https、`a[href]` 的 https/mailto，禁止 `javascript:`。
3. 主题通过 `props.html` 拿到的字符串是**已净化**的，因此允许 `set:html`。这条不变量要写进 `themes/types.ts` 的注释，否则以后有人会把未净化的内容塞进去。

Shiki 体积控制：只注册实际用到的语言（`shiki/bundle/web` + 常用十几种），双主题（github-light / github-dark）走 CSS 变量切换，不要两套 HTML。

---

## 6. SEO 策略

关键判断：**主页是无限、薄、彼此高度重复的内容**，Google 不会给排名，甚至有判定为抓取农场的风险；**真正值得索引的是 Gist 文章**。所以不要全站索引。

| 路由 | robots | canonical | 结构化数据 |
|---|---|---|---|
| `/` | index | 自身 | `WebSite` |
| `/[user]` | `noindex,follow`（配置里 `seo.index: true` 才放开） | 自身 | `Person`（`sameAs` → GitHub） |
| `/[user]/gist/[id]` | index | 自身 | `Article`（`datePublished`、`author`、`dateModified`） |
| `/[user]/repos`、`/gists`、`/repo/[repo]` | `noindex,follow` | 自身 | 无 |
| `?theme=*` | `noindex,follow` | 去掉 theme 的干净 URL | 无 |

三个必做项：

1. **真 404**：不存在的用户返回 HTTP 404（现在返回 200 + 空页面）。
2. **sitemap**：只能从「已访问用户表」生成，不能枚举 GitHub。用 KV 记录 `{ user, firstSeen, lastSeen, indexable }`，`sitemap.xml.ts` 分页输出（每文件 ≤ 50k URL）。
3. **OG 图**：主页用用户头像 + 名字拼一张静态图（`/og/[user].png`，用 `workers-og` 或直接引用头像 URL + 文字叠加），避免「分享出去是白板」。

---

## 7. 里程碑与验收

每个阶段都可独立上线、可回滚。**验收购建在 curl 上**，不靠肉眼。

### M0 · 止血（本次已做）

范围：URL 拼接修正、**代理下线**、失效链接、主题选择器指向不存在的域名、修掉既有的构建失败。
详见 `m0-hotfix.md`。

验收：

```bash
# 代理可用且有缓存头
curl -sI https://classy-api.dnevend.workers.dev/users/Dnevend | grep -i cache-control
# 白名单生效
curl -s -o /dev/null -w '%{http_code}\n' https://classy-api.dnevend.workers.dev/anything-else   # 期望 403
# 前端不再跳不存在的域名
curl -s https://classy-github.pages.dev/ | grep -o 'classygit\.me' | head   # 期望无输出
```

### M1 · Astro 骨架（已完成 2026-11-15）

范围：`apps/web` + 5 条路由 + token + 边缘缓存 + SEO 组件 + 真 404。只做 default 主题。
结果与证据见 `m1-skeleton.md`；两处偏离原计划：样式改用纯 CSS（不引 Tailwind），
高亮改用 `shiki/core` 显式注册（默认入口 27MB → 2.9MB）。

验收：

```bash
curl -s https://<preview>/Dnevend | grep -c 'og:title'        # ≥1
curl -s https://<preview>/Dnevend | grep -c 'classy-github'   # 仓库名出现在 HTML 里
curl -sI https://<preview>/Dnevend | grep -i cache-control    # s-maxage=300
curl -s -o /dev/null -w '%{http_code}\n' https://<preview>/this-user-does-not-exist-9x8f   # 期望 404
```

**CPU 结论**：已开通 $5/月套餐，且高亮只注册 21 种语言、Worker 脚本 gzip 0.55MB，
冷渲染不再是风险项；剩余观察点是缓存命中率（见 §8）。

### M2 · 配置层 + 主题契约（已完成 2026-11-15）

**配置层（`m2-config.md`）**：`classy.config.json` 的 zod 校验、逐段降级、
`seo.index` 索引开关、fork 默认分支解析，以及 Cache API TTL 不生效的线上 Bug。

**主题契约（`m2-themes.md`）**：五槽位 `themes/types.ts`、静态注册表、`?theme=`、
Base 退回纯壳、default 迁入契约、主题 CSS/JS 独立成块、缓存键含 theme、
非默认主题永不索引。顺带修掉 raw.githubusercontent.com 对 CF 出口 IP 503 导致
部分用户 README 不显示的问题（改走带 token 的 `/readme` 接口）。

验收已达成：`?theme=default` 与无参数 canonical 一致；`default.css` / `default_*.mjs`
各自独立 chunk。

### M3 · NES 主题（已完成 2026-11-15）

范围：`themes/nes/**`、`_shared/ThemeSwitcher.astro`、字体自托管。
结果与三个坑见 `m3-nes.md`。

验收达成：5 条路由在 `?theme=nes` 下全部 200；default 页面只加载 3.5KB 自己的 CSS，
NES 页面加载 279KB nes.css + 4.7KB 主题样式 —— 分包是真的成立。

**契约是否被逼改**：没有。五个槽位够用，只在实现上补了两处基础设施：
`Base` 开放 `head` 插槽（主题自注入样式表），以及主题变量必须用 `:root[data-theme=x]` 提权。

### M4 · Win95 + Mac（已完成 2026-11-15）

- Win95：引 `98.css`（纯 CSS，拷进 vendor 目录并修字体路径）；链接按钮另写样式。
- Mac：`system.css` 不在 npm 上，手写 System 6 外观（条纹标题栏 / 1px 硬阴影 / 菜单栏）。
- 同时完成：主题持久化（`?theme=` > cookie > default）、首页主题化、移动端过查。
详见 `m4-themes-mobile.md`。

### M4.5 · 主题持久化（已完成）

`?theme=` 写入 cookie，缓存键带解析后的主题，Set-Cookie 不进缓存。详见 `m4-themes-mobile.md`。

### M5 · 收尾（已完成 2026-11-15）

- `/robots.txt` + `/sitemap.xml`：KV `USERS` 记录显式开启 `seo.index` 的用户
- 删除 v1 全部残留：apps/classy、apps/nes、packages/{components,lib,shared,service}、docs/
- 根配置收敛（只留 apps/web + packages/types），锁文件 18k 行 → 4k 行
- GitHub Actions CI：check + test + build + Worker 体积守卫
- README 重写

详见 `m5-wrapup.md`。OG 图（动态分享卡片）作为独立特性留下，未做。

## 8. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| ~~Workers 免费版 10ms CPU 不够~~ | 已解除 | 已开通 $5/月 Paid（30s CPU）；仍需靠缓存把冷渲染摊薄 |
| 冷启动 + 缓存命中率不足导致 TTFB 抖动 | 首屏比静态站慢 | 缓存 300s + SWR；上线后用 `wrangler tail` 采样 p50/p95 |
| Astro 大版本迭代快（当前 7.x） | 文档/API 漂移 | 锁版本，`pnpm` 精确版本而非 `^` |
| `rehype-sanitize` 默认 schema 过严，README 样式塌 | 视觉退化 | 显式扩 schema，写一组「真实 README」快照测试 |
| 多租户缓存污染（大量随机用户名） | KV/Cache 膨胀 | 只对「成功渲染」写 KV；Cache API 自带 LRU |
| 主题契约反复变 | 返工 | M3 结束冻结契约，M4 只加不改 |
| 旧 SPA 与新站并行期间双份维护 | 分叉 | 新站从 preview 域名起步，M1 验收通过就切主域，旧站只读保留一周 |

---

### M6 · 第五套主题 + 分享卡片（已完成 2026-11-15）

TuiCss（DOS/TUI）、全站分享卡片（canvas 导出 PNG）、sitemap 两级分片。
详见 `m6-tui-share.md`。

### M7 · 体验优化（已完成 2026-11-15）

移动端资料卡置顶、双语（默认英文）、导航去掉「主页」、仓库分页、
分享卡片升级（图标按钮 / X 分享 / 二维码 / 水印）、README 统计卡限高。
配置项评估见 `config-candidates.md`。

### M10 · 社区功能（已完成 2026-11-16）

访问计数器（Durable Object）、留言簿（Gist comments）、网站环 + `/random`、
88×31 徽章、认领横幅与 `/claim/<user>`。新增配置：
`guestbook.gistId` / `webring.enabled` / `discover.enabled`。
详见 `m10-community.md`。

### M11 · Atom 订阅（已完成 2026-11-16）

`/<user>/rss.xml` 输出 Atom feed，用户主页 / Gists / Gist 详情加自动发现，
Gists 列表加 RSS 入口；1 小时边缘缓存。详见 `m11-feed.md`。

### M12 · OG 分享图（已完成 2026-11-16）

`/og/<user>.png` 1200×630 主题化社交卡片（workers-og），
主页 / Gist / 仓库详情接入 `og:image`；顺带修复 mac 默认主题下
`seo.index` 永远 noindex 的判定 bug。详见 `m12-og.md`。

### M13 · 标签 / 归档 / 阅读时间（已完成 2026-11-16）

Gist 描述支持 `#标签`，Gists 页按标签筛选，`/<user>/archive` 按月归档，
文章页显示阅读时长；Atom entry 输出 type + tags。详见 `m13-blog.md`。

### M14 · 配置生成器 `/setup`（已完成 2026-11-16）

无登录表单生成 `classy.config.json`：主题/语言/链接/近况/社区/SEO 实时 JSON，
主题 iframe 预览，复制 + fork/edit 入口；修复 `/setup` 命中通用用户缓存的问题。
详见 `m14-setup.md`。

### M15 · classygit.pages.dev + 合并 main（已完成 2026-11-16）

v2 快进合并 main；Pages 薄代理转发到 Workers；`SITE_ORIGIN` 统一
canonical / OG / RSS / sitemap；开启 Dnevend 的 webring / discover。
详见 `m15-domain.md`。

### M16 · 首页最近访问 / 统计卡样式 / 小交互修复（已完成 2026-11-16）

首页 localStorage 最近访问；Gists 头部 Archive/RSS/搜索分组；Mac 顶栏
`ClassyGit` 回首页；Mac/TUI 资料卡统计改 2×2 网格；setup 增加 Gist 创建入口。
详见 `m16-polish.md`。

### M17 · fork 配置隔离 / 默认 README / 右栏对齐（已完成 2026-11-16）

`owner` 字段防止 fork 继承作者配置；无 profile README 时渲染中英模板；
桌面端右栏与左栏同为 top 84。详见 `m17-fork-guard.md`。

## 9. 分支与部署策略

| 分支 | 角色 | 部署 |
|---|---|---|
| `main` | v2（Astro）当前生产分支 | Workers · `classygit.pages.dev`（Pages 薄代理） |
| `v2` | 集成分支，与 main 保持同步 | 同上；Worker 直连 `classy-web.dnevend.workers.dev` |

一条命令发布：

```bash
pnpm deploy:web        # = build:web + wrangler deploy --config dist/server/wrangler.json
pnpm deploy:pages      # 更新 classygit.pages.dev 薄代理
```

回滚（Workers 侧保留版本历史）：

```bash
pnpm --filter @classy/web exec wrangler deployments list --config dist/server/wrangler.json
pnpm --filter @classy/web exec wrangler rollback <version-id> --config dist/server/wrangler.json
```

收尾切流（M5 之后）：

1. `v2` 合入 `main`（fast-forward 或 squash 均可，保留 M1–M5 的分阶段记录更利于回溯）；
2. Cloudflare Pages 项目的 production branch 改到 `main`，或直接停用该项目；
3. 主域名指到 Workers（`routes` 里加 `custom_domain`），`themeDomains` / canonical 的 base 改用环境变量。

## 10. 开放问题

1. ~~Workers 免费版够不够？~~ **已解决**：已开通 $5/月套餐。
2. **`classygit.me` 还要不要？** 若要，先查注册状态；不要就把所有常量收敛到环境变量，别再写死第三次。
3. **主页要不要可索引？** 本文默认 noindex + 用户 opt-in；若想全站索引，需要额外的内容差异化策略。
4. **配置方式要不要升级？** 现在是「fork + 改 JSON」，是最大的 UX 硬伤。若做 OAuth 后台，D1 + Auth.js，并重新评估框架（见 D1 翻转条件）。
5. **NES/Mac 的字体自托管**：像素字体（Press Start 2P）体积不小，且中文没有对应字体 → 中文会 fallback 成系统字体，视觉会崩。需要给中文单独定一套 fallback 规则。

---

## 11. 附录：决策依据的实测记录（2026-11-15）

```
GET https://classy-api.dnevend.workers.dev/users/Dnevend
→ 200, x-ratelimit-limit: 60, x-ratelimit-remaining: 36, cf-cache-status: DYNAMIC
→ access-control-allow-origin: *（GitHub 透传）

GET https://classy-api.dnevend.workers.dev//users/Dnevend
→ 403 API rate limit exceeded for 172.71.215.199   ← Cloudflare 出口 IP，非访客 IP

dig classygit.me / api.classygit.me / docs.classygit.me / nes.classygit.me
→ 全部 NXDOMAIN

curl https://classy-github.pages.dev/Dnevend/repos
→ 200（SPA fallback 已生效，但配置不在仓库里）
```

代理下线记录：`wrangler delete --name classy-api --force` → `Successfully deleted classy-api`，
随后 `GET https://classy-api.dnevend.workers.dev/users/Dnevend` 返回 404 `error code: 1042`；
`api-classygit.dnevend.workers.dev` 同样返回 1042（该 worker 本就不存在）。

npm 版本（同日）：`astro@7.4.12`、`@astrojs/cloudflare@14.4.8`、`next@16.4.6`、`@opennextjs/cloudflare@1.20.17`。
