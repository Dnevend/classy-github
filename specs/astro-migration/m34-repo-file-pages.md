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
- middleware：嵌套仓库路由 TTL 300；`CACHE_VERSION` 24 → 25，让旧 HTML
  （仍带坏链接）立即失效。

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
