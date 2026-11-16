# M34 · 仓库文件页与相对链接

> 日期：2026-11-17　分支：`main`

## 问题

仓库页只渲染 README，且 `lib/markdown.ts` 只改写 `<img src>`，不改 `<a href>`。
README 里的 `[第 419 期](docs/issue-419.md)` 原样输出后，浏览器按当前页面
`/{user}/repo/{repo}` 解析成 `/{user}/repo/docs/issue-419.md`——少了仓库名，
也没有对应路由，线上直接 404（实例：`/ruanyf/repo/weekly`）。

## 路由

新增 `/{user}/repo/{repo}/{path...}`，例如：

```text
/ruanyf/repo/weekly/docs/issue-419.md
/ruanyf/repo/weekly/docs           → 目录列表
/Dnevend/repo/classy-github/LICENSE → 纯文本
```

URL 不带分支名；内容统一走默认分支（raw 与 GitHub 链接用 `HEAD` 引用）。

## 链接重写

`lib/repo-link.ts` 提供纯函数 `rewriteRepoHref(href, { login, repo, path })`，
`renderMarkdown` 新增 `repo` 上下文，在 sanitize 之后处理 `<a href>`：

| README 里的链接 | 输出 |
|---|---|
| `docs/issue-419.md` | `/ruanyf/repo/weekly/docs/issue-419.md` |
| `issue-419.md#小节` | 站内路径 + `#小节` |
| `/docs/x.md` | 按仓库根解析，站内路径 |
| `docs/` | 站内路径（目录列表） |
| `images/logo.png` | `raw.githubusercontent.com/.../HEAD/images/logo.png` |
| `../../outside.md` | 原样保留（逃出仓库根，不猜） |
| `#anchor` / `mailto:` / `https://…` | 原样保留（外链加 `target/rel`） |

仓库页、个人主页 README、文件页内部 Markdown 都传同一份上下文；主页按
`{user}/{user}` 仓库解析。

## 标题锚点

`renderMarkdown` 在 sanitize 之后运行 `rehype-slug`，按 GitHub 相同规则给
h1–h6 生成 id（中文保留、ASCII 小写、空格转 `-`、重复标题加 `-1`），
页内 `#锚点` 和跨文件 `...md#锚点` 都能跳到对应小节。

手写的 `<a name="install"></a>` 会去掉 sanitize 的 `user-content-` 前缀
（只处理 `<a>`，其他元素仍保留前缀以防 DOM clobbering），兼容老式 README。

## 文件页行为

- 目录：按 GitHub 返回顺序渲染文件列表，目录带 `/` 后缀，显示文件大小。
- Markdown：走现有 sanitize + Shiki 管线；相对图片按文件所在目录展开。
- 文本 / 代码：动态长度围栏包成代码块后高亮。
- 图片：内联预览。
- 二进制、超过 1MB：302 跳 GitHub blob。
- 文件不存在：404 + `no-store`。
- 面包屑逐级可点；顶部保留「在 GitHub 打开」。

## 其他改动

- `getRepoPath()` 走 `GET /repos/{o}/{r}/contents/{path}`，TTL 600；
  目录返回数组，文件解码 base64，超过 1MB 不返回内容。
- `ReadmeSource` 增加 `path`，用于解析 README 自身的相对链接。
- 主题 `Markdown` 槽位增加可选 `title`，仓库文件页显示文件名，gist 页显示
  gist 文件名；不传时保持 `README` / `README.md` / `README.TXT`。
- middleware：嵌套仓库路由 TTL 300；`CACHE_VERSION` 24 → 26（文件页上线
  与锚点修复各递增一次），让旧 HTML（仍带坏链接 / 无标题 id）立即失效。

## 验证

- `pnpm check`：0 errors。
- `pnpm test`：markdown smoke 新增仓库链接断言（站内、hash、根相对、
  资源、逃逸、`javascript:` 清理）。
- `pnpm build`：通过，路由与 `[repo].astro` 并存无冲突。
- 本地 dev：
  - `/ruanyf/repo/weekly` 输出 `href="/ruanyf/repo/weekly/docs/issue-419.md"`；
  - 该文件页 200 并包含「机房来了，写字楼走了」；
  - `/ruanyf/repo/weekly/docs` 目录列表 200；
  - `/Dnevend/repo/classy-github/README.md` 的 `README.en.md` 与 LICENSE
    链接站内可点，`assets/*.png` 指向 raw；
  - 不存在的文件返回 404。

## 生产验证（2026-11-17）

- Worker `classy-web` version `839a7389-50e0-4ee6-ba2d-352f61b1c186`；
  Pages 部署预览 `https://107fd37a.classygit.pages.dev`。
- `/ruanyf/repo/weekly` 输出 `href="/ruanyf/repo/weekly/docs/issue-419.md"`。
- 该文件页 200，正文包含「机房来了，写字楼走了」。
- `/ruanyf/repo/weekly/docs` 200，目录列表正常。
- 不存在的文件 404；旧错误地址 `/ruanyf/repo/docs/issue-419.md` 仍 404
  （缺少仓库名，无法恢复）。
- `/Dnevend/repo/classy-github/README.md` 的 `README.en.md`、LICENSE 链接
  站内可点，`assets/*.png` 指向 raw。
- 文件页响应头 `x-classy-cache: HIT`、`cache-control: public, s-maxage=300`。

### 锚点修复复验

- Worker `classy-web` version `5cb38d5e-8cae-4d51-8908-84cbc323603c`。
- `/Dnevend/repo/classy-github/README.md` 的 `## 三分钟开始` 输出
  `<h2 id="三分钟开始">`；`/ruanyf/repo/weekly/docs/issue-419.md` 的标题
  同样带 id（标点按 GitHub 规则移除）。
- 浏览器打开 `.../README.md#三分钟开始`：目标元素存在，`scrollY=1224`，
  元素 `top=0`，页面确实滚到对应小节。
