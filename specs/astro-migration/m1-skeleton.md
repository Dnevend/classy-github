# M1 · Astro 骨架记录

> 分支：`chore/astro-migration-m0`
> 日期：2026-11-15
> 目标：`apps/web` 跑通 5 条路由 + 服务端 token + 边缘缓存 + SEO + 真 404，只做 default 一套皮肤。

---

## 交付内容

```
apps/web/
  astro.config.mjs        Astro 7 + @astrojs/cloudflare，静态输出 + 按需路由
  wrangler.jsonc          Workers + Assets，nodejs_compat
  .npmrc（根）            修 pnpm 下 astro check 的 @emnapi 解析问题
  scripts/markdown-smoke.ts  Markdown 管线的可执行断言（含 XSS 用例）
  src/
    middleware.ts         按路由分级缓存（Cache API）+ x-classy-cache 观测头
    layouts/Base.astro    html 骨架、导航、页脚
    components/           Seo / ProfileCard / RepoCard / NotFound / ServiceError
    lib/github.ts         带 token 的 fetch + Cache API + 404 语义
    lib/markdown.ts       remark-gfm → rehype-raw → sanitize → shiki
    lib/errors.ts         safeLoad：把失败变成可渲染状态（503 / 404 / 500）
    lib/gist-rule.ts      classy.<type>.<title> 描述解析
    lib/seo.ts            SEO 元信息 + Person JSON-LD
    pages/
      index.astro                 落地页（预渲染）
      404.astro                   /404.html
      [user]/index.astro          主页：README + 最近仓库 + 资料卡
      [user]/repos.astro          全部仓库
      [user]/repo/[repo].astro    仓库详情 + README
      [user]/gists.astro          Gist 列表
      [user]/gist/[id].astro      Gist 详情（markdown 渲染 / 代码高亮）
```

---

## 关键实现决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 输出模式 | `output: 'static'` + 路由级 `prerender = false` | 落地页走静态资源、只有数据页进 Worker，省 CPU |
| 样式 | 纯 CSS + 设计变量，**暂不引 Tailwind** | 主题是 M2 的事；先避免 Tailwind v3/v4 与 `.astro` 扫描的额外变量 |
| 语法高亮 | `shiki/core` + 显式 import 21 种语言 | 默认入口会把 ~200 种语法全打进 Worker（实测 27MB → 2.9MB） |
| 高亮引擎 | `createJavaScriptRegexEngine()` | 不把 oniguruma wasm 打进 bundle |
| 缓存 | `caches.default` + `Cache-Control: s-maxage` | Workers 生成的响应 CF 不会自动缓存，必须显式 put |
| 缓存键 | `origin + pathname`（丢弃 query） | 防止 `?utm_*` 打散缓存；M2 加 `?theme=` 时要把 theme 纳入键 |
| 失败语义 | 403/429 → 503 提示页；404 → 真 404 状态 | 原 SPA 是「静默返回空」，这条必须换掉 |
| 图片/链接 | `rehypeFixUrls` 补全相对路径 + 外链 `rel="noopener noreferrer"` | README 里的图片几乎全是相对路径 |

---

## 验证证据

### 静态检查

```
$ pnpm --filter @classy/web exec astro check
Result (23 files): 0 errors, 0 warnings, 0 hints        → exit 0
```

### Markdown 管线（含 XSS 用例）

```
$ pnpm --filter @classy/web test
markdown smoke ok
  ✓ heading  ✓ codeHighlighted  ✓ table  ✓ inlineCode
  ✓ relativeImage  ✓ externalRel  ✓ externalTarget
  ✓ stripsScript  ✓ stripsOnerror  ✓ stripsIframe  ✓ stripsJavascriptHref
```

### 构建

```
$ pnpm --filter @classy/web build          → Complete! （~4.5s）
dist/server  3.0 MB / 22 文件 / gzip 0.55 MB
dist/client  32 KB
```

> 对照：用 `@shikijs/rehype` 默认入口时是 **27 MB / 638 文件**，换成 `shiki/core` 后降了一个数量级。

### 生产构建的运行时（`wrangler dev` from `dist/server`，带 token）

```
/                         200
/Dnevend                  200   cache-control: public, s-maxage=300, stale-while-revalidate=3600
/Dnevend/repos            200
/Dnevend/repo/classy-github 200  （README 渲染，2 个 shiki 代码块）
/Dnevend/gists            200
/Dnevend/gist/9ec0af...   200   cache-control: public, s-maxage=3600, stale-while-revalidate=43200
                                标题：axios · Dnevend · ClassyGit（前缀已剥离）
/zzz-not-exist-9x8f       404
/Dnevend/zzz-repo-9x8f    404

缓存：/sindresorhus 第一次 MISS → 第二次 HIT
```

### 无 token 时的降级（= 线上匿名限流）

```
（未注入 GITHUB_TOKEN 的构建）
/zzz-not-exist-9x8f  → 503 + 「GitHub 接口暂时限流」页面
```

---

## 已知问题与后续

| 项 | 现状 | 计划 |
|---|---|---|
| `?theme=` | 未实现，只有一套皮肤 | M2 主题契约 |
| 主题 CSS 分包 | 未拆分 | M2 |
| Gist 分类浏览 / 年份大纲 | 只有时间无关的平铺列表 | M2 |
| 分页 | 只取前 100 条，无「更多」 | M2（query 分页，服务端渲染） |
| sitemap / robots / OG 图 | 未做，主页 `noindex` | M5 |
| 用户配置 `classy.config.json` | 未接入，仓库卡片数写死 6 | M2（zod + 深合并 + TTL） |
| `apps/classy` / `apps/nes` | 仍在跑，作为旧版备份 | 切流后删除 |
| Workers 部署 | 未部署（本地验证到 `wrangler dev`） | 见下 |

---

## 已部署（2026-11-15）

```
https://classy-web.dnevend.workers.dev     版本 db3e561e
Total Upload: 2966.30 KiB / gzip: 544.93 KiB
Worker Startup Time: 9 ms
```

部署过程中修掉两处会直接挡住上线的问题：

1. `wrangler deploy` 报 `Found both a user configuration file at "wrangler.json" and a deploy
   configuration file at "../../.wrangler/deploy/config.json"` —— 本地 `astro dev` 留下的
   `.wrangler/` 状态目录与 `dist/server/wrangler.json` 冲突，`rm -rf apps/web/.wrangler` 后正常。
2. 适配器默认会给 Worker 加 `SESSION`（KV）和 `IMAGES`（Cloudflare Images）绑定，
   部署时会要求先建 KV / 开通 Images。M1 用不到，已在 `astro.config.mjs` 里
   `session: false` + `imageService: 'passthrough'` 关掉，生成的配置里 `kv_namespaces` 为空。

### 配 token 前（匿名配额）

```
/                   200  0.75s
/Dnevend            200  2.06s（首次）→ 再次请求 x-classy-cache: HIT
/Dnevend/repos      200
/Dnevend/gists      503  ← 匿名配额被 CF 出口 IP 共享，触发限流
/zzz-not-exist      404
```

### 配 token 后（`wrangler secret put GITHUB_TOKEN`）

```
wrangler secret list → [{ name: "GITHUB_TOKEN", type: "secret_text" }]

/Dnevend                 200  0.30s  HIT   title/OG/JSON-LD 齐全，6 个仓库卡，README 渲染
/Dnevend/repos           200  0.25s  HIT   47 个仓库链接
/Dnevend/gists           200  0.38s  HIT   9 条 Gist，标题已剥离前缀（axios / EIP / Uniswap）
/Dnevend/gist/<id>       200  0.95s  HIT   s-maxage=3600，1 个 shiki 代码块
/Dnevend/repo/classy-github 200 1.64s      2 个 shiki 代码块，README prose
/zzz-not-exist-9x8f      404

冷启动用户（连打 6 个账号 × 2 次，共 12 次）：
  首次渲染 1.45–2.28s，命中缓存 0.30–1.04s，无一例 503  ← token 生效
```

结论：边缘缓存在线上生效；token 配好后不再出现 503。冷渲染 1.5–2.3s 是当前的主要体感问题，
M5 可以考虑：热门用户预热、或把 `getUser` 与 `listRepos` 的串行依赖拆掉。

## 部署步骤（给后续用）

```bash
cd apps/web
pnpm build

# 1) 写 token（建议 classic PAT 且不勾任何 scope，或 fine-grained 的
#    “Public repositories (read-only)”）。命令会交互式读取，不进 shell 历史。
cd dist/server && ../../node_modules/.bin/wrangler secret put GITHUB_TOKEN

# 2) 部署（在 dist/server 下，用适配器生成的 wrangler.json）
cd dist/server && ../../node_modules/.bin/wrangler deploy
```

> 若 `wrangler deploy` 报配置冲突，删掉 `apps/web/.wrangler/`（本地 dev 状态）再试。

本地开发期用 `.dev.vars`（已在 `.gitignore`）：

```
GITHUB_TOKEN=github_pat_xxx
```

---

## 踩到并修掉的两个坑（写下来免得下次重犯）

1. **`astro check` 在 pnpm 下起不来**：`@napi-rs/wasm-runtime` 的可选依赖（`@emnapi/*`、`@tybys/*`）无法从虚拟 store 解析。解法是根目录 `.npmrc` 加 `public-hoist-pattern`，不是装 `@emnapi/core` 到每个包。
2. **`@shikijs/rehype` 的 `langs` 选项不会裁剪 bundle**：它内部走 shiki 全量注册表，动态 import 全部语法。必须用 `@shikijs/rehype/core` + `createHighlighterCore` 显式注册。
