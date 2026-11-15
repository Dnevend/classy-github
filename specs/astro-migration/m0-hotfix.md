# M0 止血记录

> 分支：`chore/astro-migration-m0`
> 日期：2026-11-15
> 目标：在不改架构的前提下，让当前 SPA 可构建、可部署、不再往死链跳，并把不需要的东西关掉。

---

## 先说结论：代理下线，而不是修复

原本的计划是「给 Worker 加缓存 + 路径白名单再部署」。实施到一半确认了 owner 的判断：**生产环境无人在用，且 M1 之后服务端渲染根本不需要它**。

于是改为直接删除：

```
$ wrangler delete --name classy-api --force
Successfully deleted classy-api

$ curl https://classy-api.dnevend.workers.dev/users/Dnevend
status=404  error code: 1042          ← worker 已不存在

$ curl https://api-classygit.dnevend.workers.dev/users/Dnevend
status=404  error code: 1042          ← 这个 worker 本来就没部署过
```

代码侧同步删除：`packages/service/` 整个目录、`githubUrl.proxyApi`、`gitApiFetch` 的代理回退分支、根 `package.json` 的 `dev:service` / `publish:service`。

> 附带好处：删掉 `fake-useragent`（2017 年的无人维护包）后，worker bundle 从原来的「全套 UA 列表」降到 **45.61 KiB / gzip 11.17 KiB**；代理特有的「开放转发 + 随机 UA + 无缓存」三个问题一起消失。

---

## 变更清单

| # | 文件 | 改了什么 | 为什么 |
|---|---|---|---|
| 1 | `packages/service/`（删除） | 整个代理服务下线 | 生产无人在用；M1 起由 Astro 服务端带 token 取数，不再需要公开中继 |
| 2 | `packages/shared/constants/index.tsx` | 移除 `proxyApi`；`themeDomains` 只保留已部署的 `default`；`classyDomains.docs` 指向仓库 | 原域名 `api.classygit.me` 已 NXDOMAIN；nes/win95/mac 子域从未部署，选中即跳死链 |
| 3 | `packages/lib/request/index.ts` | 新增 `joinUrl()` 统一拼接；移除代理回退；非 2xx / 404 打日志 | 原先是字符串相加，base 带尾斜杠会拼出 `host//users/x`；失败全静默，线上「页面空白」无从排查 |
| 4 | `packages/lib/utils/index.ts` | `redirectTheme()` 在目标主题无域名时直接 return | 防止把用户跳到不存在的域名 |
| 5 | `apps/classy/src/App.tsx` | `homePage` 计算加 `themeDomain` 判空 | 同上，配合 `Partial<Record<Theme, string>>` 类型 |
| 6 | `apps/nes/src/App.tsx` | 同上（1 行） | 保证 nes 删除前仍能编译 |
| 7 | `apps/classy/tailwind.config.ts` | `mini-svg-data-uri` 改用 `require` 取导出 | **修掉一个既有的构建失败**：该包是纯 CJS 且无 `__esModule`，Tailwind 用 jiti 加载配置不注入 interop，`import` 拿到 `undefined` → `vite build` 报 `_minisvgdatauri2.default.call is not a function` |
| 8 | `apps/classy/public/_redirects`（新增） | `/* /index.html 200` | SPA 深链兜底写进仓库，不再依赖 dashboard 里的隐形配置 |
| 9 | `package.json` | 删除 `dev:service` / `publish:service` | 服务已不存在 |
| 10 | `classy.config.json` / `README.md` | 失效链接改为仓库地址 / `classy-github.pages.dev` | `docs.classygit.me`、`classygit.me` 均已 NXDOMAIN |

---

## 验证证据

### 类型检查

```
$ apps/classy/node_modules/.bin/tsc -p apps/classy --noEmit       → exit 0
$ apps/nes/node_modules/.bin/tsc -p apps/nes --noEmit             → exit 0
```

（`packages/service` 已删除，不再有第三项。）

### 构建

```
$ cd apps/classy && vite build     → ✓ built in ~2.3s
$ cd apps/nes && vite build        → ✓ built in ~1.5s

修复 #7 之前：Build failed in 218ms
```

> 顺带量到的事实：`apps/classy/dist` 共 2.5MB，三个 JS chunk 分别是 972KB / 885KB / 522KB（gzip 336 + 296 + 172 ≈ 800KB）。这印证了「语法高亮 + 全量依赖进客户端」的问题，M1 起由服务端 Shiki + 岛屿架构处理。

### 代理下线

```
HTTP 404  error code: 1042   （classy-api.dnevend.workers.dev）
HTTP 404  error code: 1042   （api-classygit.dnevend.workers.dev）
```

### 下线前的代理行为（历史记录，代码已删）

在本地 miniflare 里验证过「缓存 + 白名单」方案本身是可用的，只是最终没部署：

```
req1: x-classy-cache: MISS
req2: x-classy-cache: HIT
req3: x-classy-cache: HIT          ← 三次请求只回源一次
/users/zzz-not-exist-9x8f → 404，且不进缓存
/evil → 403 {"message":"Path not allowed by proxy", ...}
```

同时量到的基线（也是决定下线的依据之一）：

```
GET https://classy-api.dnevend.workers.dev/users/Dnevend
→ 200, x-ratelimit-limit: 60, remaining: 36, cf-cache-status: DYNAMIC
→ 匿名配额、全局共享、完全没缓存
```

---

## 部署

**前端（Cloudflare Pages）**

合并到 `main` 后自动重新构建。构建命令：

```
pnpm install --frozen-lockfile
pnpm build:classy        # 输出 apps/classy/dist
```

> `pnpm-lock.yaml` 本次有变更（删了 `fake-useragent`、`wrangler`、`hono` 等整条服务依赖），必须一并提交，否则 `--frozen-lockfile` 会失败。

**代理**：无。已下线。

---

## 已知遗留（不在 M0 范围）

| 项 | 现状 | 计划 |
|---|---|---|
| 匿名限流 | 代理删了，浏览器直连 GitHub 仍是 60 次/小时/IP | M1 服务端 token 取代 |
| 失败仍是静默 | 现在至少会打日志，UI 依旧空白 | M1 引入错误态与 404 页 |
| 主题选择器只剩 default | 刻意的：其余主题尚未部署 | M2/M3 用 `?theme=` 恢复 |
| `apps/nes` 仍在 | 未删，留到 M0.5 | 删前按 `theme-contract.md` §11 抄出 3 处 |
| `pnpm lint` 失败 | 1 个既有 error（`pages/gists/index.tsx` 废弃的 eslint-disable）+ 4 个 shadcn 的 react-refresh warning，`--max-warnings 0` 下必然红 | M5 加 CI 时一并处理 |
| `docs/` 仍是 Docusaurus 模板 | 未改过 | M5 删除或重写 |

---

## 回滚

全部是配置与单文件逻辑改动，无数据结构变更：

```bash
git revert --no-commit <m0-commit>
```

唯一不可自动回滚的是**已删除的线上 worker**。若确需恢复：代码在 `git show 158b058:packages/service`，重新 `wrangler deploy` 即可；但按当前路线图（M1 服务端 token）没有恢复的必要。
