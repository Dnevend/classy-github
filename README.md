<h1 align="center">ClassyGit</h1>

<p align="center"><strong>你的 GitHub，换一种打开方式。</strong></p>

<p align="center">
  <a href="https://classygit.dev"><img src="./assets/demo.gif" alt="ClassyGit 四套复古主题演示（15 秒）" width="880"></a>
</p>

<p align="center">
  <a href="https://classygit.dev" target="_blank"><strong>在线体验</strong></a> ·
  <a href="#三分钟开始"><strong>3 分钟开始</strong></a> ·
  <a href="https://classygit.dev/setup" target="_blank"><strong>配置生成器</strong></a> ·
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/Dnevend/classy-github/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-black?style=flat-square"></a>
  <a href="https://astro.build"><img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-FF5D01?style=flat-square&logo=astro&logoColor=white"></a>
  <a href="https://workers.cloudflare.com"><img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white"></a>
  <a href="https://github.com/Dnevend/classy-github/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square"></a>
  <a href="https://github.com/Dnevend/classy-github"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Dnevend/classy-github?style=flat-square&color=black"></a>
</p>

<p align="center">
  <a href="https://linux.do" title="LINUX DO"><img alt="LINUX DO" src="https://img.shields.io/badge/LINUX-DO-FFB003?style=flat-square"></a>
</p>

不用部署、不用登录、不用买服务器：把 README、仓库和 Gist 变成一座复古个人主页 + 博客。打开 [classygit.dev](https://classygit.dev) 立刻试。

<table>
  <tr>
    <td width="50%" align="center">
      <a href="https://classygit.dev/Dnevend?theme=mac"><img src="./assets/promo/out/theme-sheet-mac.png" alt="mac 主题" width="100%"></a>
      <br><sub><code>mac</code> · System 6</sub>
    </td>
    <td width="50%" align="center">
      <a href="https://classygit.dev/Dnevend?theme=nes"><img src="./assets/promo/out/theme-sheet-nes.png" alt="nes 主题" width="100%"></a>
      <br><sub><code>nes</code> · 8-bit</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="https://classygit.dev/Dnevend?theme=win98"><img src="./assets/promo/out/theme-sheet-win98.png" alt="win98 主题" width="100%"></a>
      <br><sub><code>win98</code> · Windows 98</sub>
    </td>
    <td width="50%" align="center">
      <a href="https://classygit.dev/Dnevend?theme=tui"><img src="./assets/promo/out/theme-sheet-tui.png" alt="tui 主题" width="100%"></a>
      <br><sub><code>tui</code> · DOS</sub>
    </td>
  </tr>
</table>

<p align="center"><sub>mac / nes / win98 / tui · 截图来自 <a href="https://classygit.dev/Dnevend">Dnevend 的主页</a></sub></p>

## 为什么是 ClassyGit

ClassyGit 不是又一个静态博客生成器。它不托管内容，也不要求你把文章搬过来：它把你已经在 GitHub 上的公开数据——个人主页 README、仓库、Gist、Gist 评论——直接渲染成一座个人主页 + 博客。

- **不用部署**：Fork 仓库，改一个 `classy.config.json`，最多 5 分钟生效。没有 build、CI、发布按钮。
- **不用登录**：访客打开链接就能看；站主也不用注册，配置就是 GitHub 上的一个文件。
- **不用服务器**：内容在 GitHub，页面由 Cloudflare 边缘渲染。没有 VPS、数据库、对象存储要维护。

> 你的内容不在 ClassyGit 的数据库里，它一直在你的 GitHub 上。ClassyGit 只是一层可以替换的皮肤。即使公共实例哪天停止，README、仓库、Gist 和留言仍然在 GitHub；代码是 MIT，换一个实例或自建就能继续。

适合想有主页但不想维护服务器的人、已经在 GitHub 写 README / 用 Gist 记笔记的人，以及喜欢 System 6、8-bit、Windows 98、DOS 复古美学的人。

## 三分钟开始

1. **Fork**：[Dnevend/classy-github](https://github.com/Dnevend/classy-github/fork)，仓库名保持 `classy-github`（fork 默认就是）。
2. **填配置**：打开 [`/setup?u=你的用户名`](https://classygit.dev/setup)，填表复制 JSON 到 fork 根目录的 `classy.config.json`；把 `owner` 改成你的 GitHub 用户名。
3. **等 5 分钟**：打开 [`https://classygit.dev/你的用户名`](https://classygit.dev/)，主页最多 5 分钟刷新，不用构建、部署或 CI。

> 想先看效果：任何公开 GitHub 账号都能直接打开 `https://classygit.dev/<用户名>`，不用 fork。普通用户不需要 `pnpm`、Cloudflare 账号或域名。

## 你能得到什么

- **README 直接当主页**：读取你的 GitHub profile README，保留 Markdown、代码高亮、相对图片，以及 `#gh-dark-mode-only` / `<picture>` 深浅色主题图片（按站点主题只显示一张）；资料卡、贡献墙、最近仓库、最近 Gist、近况都会自动生成。
- **Gist 就是博客**：Gist 描述写 `classy.blog.标题 #标签`（类型名用英文字母），自动变成分类、标题和标签；支持多文件、阅读时间、按月归档和标签筛选。
- **四套复古主题**：`mac`、`nes`、`win98`、`tui` 共用同一份数据；站主设默认主题，访客用 `?theme=` 或页脚切换。
- **分享与传播**：主题化分享卡（带二维码）、1200×630 OG 图、88×31 徽章、Atom 订阅和 Sitemap；SEO 默认关闭，`seo.index: true` 才允许收录。
- **留言簿和网站环**：用公开 Gist 评论当留言板；页脚「上一站 / 随机 / 下一站」连接其他复古站点。
- **快、干净、可替换**：服务端直出 HTML，边缘缓存；四套主题在 375px 宽下无横向溢出；不存 IP、不做用户画像，只有主题和语言两个功能性 cookie；README / Gist / 留言走白名单清洗，`javascript:` 链接会被丢弃。

<details>
<summary>全部页面路由</summary>

| 路由 | 你能看到 |
|---|---|
| `/<用户名>` | README、资料卡、关注数、贡献墙、最近仓库、最近 Gist、近况 |
| `/<用户名>/repos` | 全部公开仓库，搜索 + 分页 |
| `/<用户名>/repo/<仓库名>` | 仓库 README |
| `/<用户名>/gists` | 公开 Gist（最多 100 条），标签筛选 + 搜索 |
| `/<用户名>/gist/<id>` | 文章：Markdown、代码高亮、阅读时间、多文件 |
| `/<用户名>/archive` | 按月份归档（最多 100 条 Gist） |
| `/<用户名>/guestbook` | 留言簿（Gist 评论） |
| `/<用户名>/rss.xml` | Atom 订阅（最近 50 条 Gist） |
| `/webring` | 网站环目录 |
| `/random` | 随机去一个站点 |
| `/badge/<用户名>` | 88×31 徽章生成器 |
| `/setup?u=<用户名>` | 配置生成器 + 实时预览 |
| `/claim/<用户名>` | 三步认领页 + 初始配置 |

</details>

## 四套主题

四套主题共用同一份数据，主题只决定外壳。

- 默认主题由 `classy.config.json` 的 `theme` 决定（不填是 `mac`）；优先级是 `?theme=` > cookie > 站主配置 > `mac`。
- 每套主题的 CSS 独立打包，访问 `mac` 的访客不会下载 NES 的 279KB；旧链接 `?theme=default` 自动落到 `mac`，`?theme=win95` 落到 `win98`。
- 没有配置封面时，四套主题各自渲染默认横幅；分享卡、OG 图、徽章都会跟随主题配色。

## 社区功能

ClassyGit 不是一个人的主页，而是一圈可以互相串门的复古站点。

| 功能 | 一句话 | 怎么开 |
|---|---|---|
| 网站环 | 页脚「上一站 / 随机 / 下一站」，`/webring` 是目录 | 默认开启，`webring.enabled` |
| 随机推荐 | `/random` 随机跳到一个站点 | 默认开启，`discover.enabled` |
| 留言簿 | 用公开 Gist 的评论当留言板 | `guestbook.gistId` |
| 访客计数器 | 页脚「第 N 位访客」，不存 IP | 认领后自动 |
| 88×31 徽章 | 四主题小徽章，放 README / 友链 | `/badge/<用户名>` |

<details>
<summary>网站环和留言簿怎么开</summary>

**网站环**：加入后，你的站点会出现在 `/webring` 目录；成员满 3 个后，页脚出现「← 上一站 / 🎲 / 下一站 →」。不想参加就把 `enabled` 设为 `false`。

```json
{
  "webring": { "enabled": true },
  "discover": { "enabled": true }
}
```

**留言簿**：新建一条**公开** Gist，描述写 `classy.guestbook`，把 Gist ID 填进配置。访客在 GitHub 上评论，站点只读展示；站主要删留言，直接在 Gist 里删。这条 Gist 必须是公开的、且属于你，否则站点会拒绝展示。

```json
{
  "guestbook": { "gistId": "9ec0af30..." }
}
```

留言需要 GitHub 账号——复用 GitHub 身份，不再多一套密码。评论里的图片和嵌入会被剥离，避免追踪像素。

</details>

## 自定义配置

推荐打开 [`/setup?u=<用户名>`](https://classygit.dev/setup) 填表生成；生成器只生成 JSON，不会请求 GitHub 授权，也不会替你写仓库。也可以直接编辑 fork 根目录的 `classy.config.json`。仓库名必须是 `classy-github`，`owner` 必须是你的 GitHub 用户名——保留作者的 `owner` 会被当模板忽略。

最小可用配置：

```json
{
  "owner": "your-login",
  "theme": "mac",
  "language": "zh",
  "links": [
    { "title": "GitHub", "href": "https://github.com/your-login" }
  ],
  "guestbook": { "gistId": null },
  "webring": { "enabled": true },
  "discover": { "enabled": true },
  "seo": { "index": false }
}
```

常用开关：

| 想做什么 | 改哪里 |
|---|---|
| 换默认主题 | `"theme": "nes"`（可选 `mac` / `nes` / `win98` / `tui`） |
| 分享指定主题 | 在链接后加 `?theme=nes` |
| 默认中文 | `"language": "zh"` |
| 加封面图 | `"profile": { "cover": "/images/cover.jpg" }` 或任意 http(s) 图片 |
| 隐藏贡献墙 | `"profile": { "contrib": { "visible": false } }` |
| 主页显示几个仓库 / Gist | `"profile": { "repos": { "showCount": 6 }, "gists": { "showCount": 6 } }` |
| 加页脚链接 / 近况 | `"links": [{ "title": "Blog", "href": "https://…" }]`、`"now": { "books": ["…"] }` |
| 开留言簿 | `"guestbook": { "gistId": "…" }` |
| 参加网站环 / 随机推荐 | `"webring": { "enabled": true }`、`"discover": { "enabled": true }` |
| 允许搜索引擎收录 | `"seo": { "index": true }` |
| 导航加外链 | `"nav": { "extra": [{ "title": "…", "href": "https://…" }] }`（mac / win98 主题） |

> `profile.gists` 是主页右栏的「最近 Gist」预览；`gists` 是 Gist 描述规则，两者不是一回事。

<details>
<summary>完整配置示例、字段说明和容错行为</summary>

```json
{
  "owner": "your-login",
  "theme": "mac",
  "language": "zh",
  "profile": {
    "cover": "https://example.com/cover.jpg",
    "cardUrl": null,
    "contrib": { "visible": true },
    "repos": { "visible": true, "showCount": 6 },
    "gists": { "visible": true, "showCount": 6 }
  },
  "gists": {
    "prefix": "classy",
    "split": ".",
    "default": null,
    "type": [{ "name": "blog" }, { "name": "code" }]
  },
  "links": [
    { "title": "GitHub", "href": "https://github.com/your-login" },
    { "title": "Blog", "href": "https://example.com" }
  ],
  "nav": {
    "extra": [{ "title": "About", "href": "https://example.com/about" }]
  },
  "now": {
    "books": ["《置身事内》"],
    "music": ["坂本龍一 - async"],
    "watching": []
  },
  "guestbook": { "gistId": null },
  "webring": { "enabled": true },
  "discover": { "enabled": true },
  "seo": { "index": false }
}
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `owner` | `null` | 配置归属的 GitHub 用户名。与当前用户不一致时整份配置按模板忽略；为空或非法时按旧配置接受。 |
| `theme` | `mac` | 默认主题：`mac` / `nes` / `win98` / `tui`。访客没有 `?theme=` 或 cookie 时使用它。 |
| `language` | `en` | 默认语言：`en` / `zh`。访客可用 `?lang=` 覆盖。 |
| `profile.cover` | `null` | 资料卡封面图；不填时显示主题化默认横幅。接受 http(s) 图片或站内路径。 |
| `profile.cardUrl` | `null` | 「近况」卡片底部嵌入的第三方统计图，例如 Action 生成的 SVG。 |
| `profile.contrib.visible` | `true` | 是否显示贡献活跃度。 |
| `profile.repos.visible` | `true` | 是否显示主页的最近仓库。 |
| `profile.repos.showCount` | `6` | 主页显示多少个仓库，范围 0–100。 |
| `profile.gists.visible` | `true` | 是否显示主页的最近 Gist。 |
| `profile.gists.showCount` | `6` | 主页显示多少条 Gist，范围 0–100。 |
| `gists.prefix` | `classy` | Gist 描述前缀，默认规则是 `classy.blog.标题 #标签`。 |
| `gists.split` | `.` | 前缀 / 类型 / 标题之间的分隔符。 |
| `gists.default` / `gists.type` | — | 旧版兼容字段，当前版本不参与渲染。 |
| `links` | `[]` | 页脚链接，每项 `{ "title", "href" }`；只接受 http(s)，标题最多 64 字。 |
| `nav.extra` | `[]` | 导航外链，最多 5 条；当前只在 `mac` / `win98` 主题显示。 |
| `now.books` / `music` / `watching` | `[]` | 近况；各最多 8 条，每条最多 80 字。 |
| `guestbook.gistId` | `null` | 公开且属于你的 Gist ID（20–40 位十六进制）；`null` 关闭留言簿。 |
| `webring.enabled` | `true` | 是否加入网站环；成员满 3 个后页脚出现「上一站 / 随机 / 下一站」。 |
| `discover.enabled` | `true` | 是否允许出现在 `/random` 随机推荐里。 |
| `seo.index` | `false` | 是否允许搜索引擎收录主页；访客切到其他主题时保持 `noindex`。 |

**配置写错了会怎样**：每一段独立校验，坏的那段回退默认值，其他段照常生效；`links` 逐条校验，坏链接只丢一条；未知字段直接丢弃；主题名写错回退 `mac`，语言写错回退 `en`。

</details>

## 工作原理

```text
GitHub                          Cloudflare
┌──────────────────────┐        ┌───────────────────────────────┐
│ README / repos       │        │ Astro SSR on Workers          │
│ Gists / comments     │ ─────► │ edge cache + KV + Durable OBJ │
│ classy.config.json   │  API   │ no database for content       │
└──────────────────────┘        └──────────────┬────────────────┘
                                                │
                                                ▼
                                 classygit.dev/<username>
```

- **GitHub 是内容源，也是身份源**：README、仓库、Gist、留言都在 GitHub，ClassyGit 不复制、不托管。
- **Cloudflare 只做渲染、缓存和计数**：Workers 跑 Astro SSR，KV 存网站环 / 随机推荐 / 可索引用户，Durable Object 存访客数。
- **没有内容数据库**：即使 Cloudflare 侧的 KV / DO 全部丢失，你的主页内容也不会丢——重新访问一次就会从 GitHub 重建。

## 常见问题

<details>
<summary><strong>需要自己的服务器或域名吗？</strong></summary>

不需要。公共实例直接给你 `https://classygit.dev/<用户名>`；想绑自己的域名再自建。
</details>

<details>
<summary><strong>需要登录吗？</strong></summary>

浏览不需要；站主也不需要登录 ClassyGit，只要用 GitHub 账号放配置。留言需要 GitHub 账号，因为评论就是 Gist 评论。
</details>

<details>
<summary><strong>网站会下线吗？内容会丢吗？</strong></summary>

内容一直在 GitHub；站点只是渲染层。没有服务器可到期，没有内容数据库可丢失。即使公共实例哪天停止，README、仓库、Gist、留言仍然在 GitHub；代码是 MIT，换一个实例或自建就能继续。
</details>

<details>
<summary><strong>改了 README / 仓库，多久生效？</strong></summary>

配置（主题、链接、近况）最多 5 分钟；README、仓库和 Gist 列表最多缓存 30 分钟，用来扛住首发流量和爬虫。想立刻确认配置，从本站打开 `?preview=1`。
</details>

<details>
<summary><strong>会被 GitHub API 限流吗？</strong></summary>

生产实例用服务端 GitHub token + 边缘缓存，并在 Worker 层拦截 AI 爬虫；配额真的耗尽时优先返回 24 小时内的旧页面（`x-classy-stale`），而不是错误页。
</details>

<details>
<summary><strong>能当博客用吗？支持私有内容吗？</strong></summary>

能。公开 Gist 就是文章，支持 Markdown、代码高亮、标签、归档、阅读时长和 Atom 订阅。只读取公开数据；私有仓库和 secret Gist 不会显示。
</details>

<details>
<summary><strong>为什么默认不被搜索引擎收录？</strong></summary>

用户页是无限生成的薄内容，默认不收录，避免污染搜索。想收录就设 `seo.index: true`；默认主题页面输出 `index`，访客切到其他主题时保持 `noindex`。
</details>

<details>
<summary><strong>主题和语言会记住吗？隐私怎么处理？</strong></summary>

会。选择写在 cookie 里；站点默认主题由 `classy.config.json` 的 `theme` 决定，也可以用 `?theme=nes` / `?lang=zh` 临时切换。应用不存 IP、不做用户画像，默认不加载分析脚本，只有主题和语言两个功能性 cookie；作者实例可选启用无 Cookie 的 Cloudflare Web Analytics（由 `PUBLIC_CF_ANALYTICS_TOKEN` 控制，不配则不注入）；首页「最近访问」只存在本机 localStorage，不上传。
</details>

## 开发与自建

<details>
<summary>本地开发、自建实例、项目结构</summary>

### 本地开发

需要 Node 22+、pnpm 9+。

```bash
git clone https://github.com/Dnevend/classy-github.git
cd classy-github
pnpm install

# 可选：配置 GITHUB_TOKEN 提高 API 配额
echo 'GITHUB_TOKEN=github_pat_xxx' > apps/web/.dev.vars
pnpm dev            # http://localhost:4321
```

`GITHUB_TOKEN` 只读 public repo 即可（classic PAT 不勾任何 scope 也行）。不配也能跑，但匿名配额是 60 次/小时，容易触发限流提示。贡献墙需要 token 才能拉到 GitHub GraphQL 数据。

### 自建实例

自建需要 Cloudflare 账号。仓库里的 `apps/web/wrangler.jsonc` 已经配好 Assets、KV 和 Durable Object，但 **KV 命名空间 ID 需要换成你自己的**：

```bash
# 1) 创建 KV 命名空间，把返回的 id 填进 wrangler.jsonc
pnpm --filter @classy/web exec wrangler kv namespace create USERS

# 2) 构建 + 发布 Worker
pnpm deploy:web

# 3) 写入 GitHub token（只读 public repo）
cd apps/web/dist/server && ../../node_modules/.bin/wrangler secret put GITHUB_TOKEN
```

- `SITE_ORIGIN` 在 `wrangler.jsonc` 里，决定 canonical / OG / feed / sitemap 使用的域名；自建时改成你的最终地址。
- 可选：启用 Cloudflare Web Analytics。在 dashboard 的 Web Analytics 里为你的域名建一条站点并复制 token，写进 `apps/web/.env`（已在 `.gitignore`）：`echo 'PUBLIC_CF_ANALYTICS_TOKEN=...' > apps/web/.env`，再构建发布。不配则 HTML 里不会出现任何分析脚本。
- 如果还要维护自己的 Pages 薄代理，改 `apps/web/pages-proxy/_worker.js` 的 `TARGET` 和 `apps/web/package.json` 的 `project-name`，再跑 `pnpm deploy:pages`；不需要就跳过。
- 作者使用 Workers Paid（$5/月）主要是给 Shiki 语法高亮留 CPU 余量；轻度使用可以先试免费计划。

### 项目结构

```text
apps/web/
  src/pages/            用户页 / 列表 / 详情 + webring / badge / claim / setup / api
  src/themes/           契约（5 个槽位）+ mac / nes / win95（主题名 win98）/ tui
  src/lib/              GitHub 取数、Markdown 管线、配置校验、站点注册表、边缘缓存
  src/middleware.ts     主题 / 语言解析 + 按路由分级缓存
  wrangler.jsonc        Workers / KV / Durable Object 绑定
packages/types/         GitHub 数据类型
specs/                  重构计划与每个阶段的实现记录
```

### 参与贡献

欢迎 Issue 和 PR。改动前先跑：

```bash
pnpm check
pnpm test
pnpm build
```

</details>

## 分享 ClassyGit

如果这个项目让你想重新装修自己的 GitHub：

- ⭐ [Star 这个仓库](https://github.com/Dnevend/classy-github)
- 🐦 [分享到 X](https://twitter.com/intent/tweet?text=ClassyGit%20%E2%80%94%20%E6%8A%8A%20GitHub%20%E5%8F%98%E6%88%90%E4%B8%80%E5%BA%A7%E5%A4%8D%E5%8F%A4%E4%B8%AA%E4%BA%BA%E4%B8%BB%E9%A1%B5%20%2B%20%E5%8D%9A%E5%AE%A2%E3%80%82&url=https%3A%2F%2Fclassygit.dev)
- 把它发给那个「一直想开博客但迟迟没动手」的朋友

把徽章放到你的 README 或友链：

```md
[![ClassyGit](https://classygit.dev/badge/你的用户名.svg?theme=mac)](https://classygit.dev/你的用户名)
```

[![ClassyGit badge](https://classygit.dev/badge/Dnevend.svg?theme=mac)](https://classygit.dev/badge/Dnevend)

<details>
<summary>看看 OG 预览图</summary>

![ClassyGit OG](https://classygit.dev/og/Dnevend.png)

</details>

## 友链

- [LINUX DO](https://linux.do) — 一个友好的开发者社区

## 许可

代码 [MIT](./LICENSE)。字体与第三方样式：

- **Fusion Pixel Font**（OFL-1.1）— `apps/web/public/fonts/fusion-pixel-12px-zh_hans.woff2`
- **Press Start 2P**（OFL-1.1）— `apps/web/public/fonts/press-start-2p.woff2`
- **98.css**（MIT）— `apps/web/src/themes/win95/vendor/98.css`（主题名是 `win98`）
- **NES.css**（MIT）— npm 依赖
- **TuiCss**（MIT）— `apps/web/src/themes/tui/vendor/`，字体 Perfect DOS VGA 437 自托管
