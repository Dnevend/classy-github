# M0 止血记录

> 分支：`chore/astro-migration-m0`
> 日期：2026-11-15
> 目标：在不改架构的前提下，让当前 SPA 可正常使用、可部署、可观测。

---

## 变更清单

| # | 文件 | 改了什么 | 为什么 |
|---|---|---|---|
| 1 | `packages/shared/constants/index.tsx` | `proxyApi` 指向 `https://classy-api.dnevend.workers.dev`（**不带尾斜杠**）；`themeDomains` 只保留已部署的 `default`；`classyDomains.docs` 指向仓库 | 原域名 `api.classygit.me` 已 NXDOMAIN；`themeDomains` 里 nes/win95/mac 从未部署，选中即跳死链 |
| 2 | `packages/lib/request/index.ts` | 新增 `joinUrl()` 统一拼接；非 2xx 打日志；404 直接短路；代理失败也打日志 | 原先是字符串相加，base 带尾斜杠会拼出 `host//users/x`；失败全静默，线上「页面空白」无从排查 |
| 3 | `packages/lib/utils/index.ts` | `redirectTheme()` 在目标主题无域名时直接 return | 防止把用户跳到不存在的域名 |
| 4 | `apps/classy/src/App.tsx` | `homePage` 计算加 `themeDomain` 判空 | 同上，配合 `Partial<Record<Theme, string>>` 类型 |
| 5 | `apps/nes/src/App.tsx` | 同上（1 行） | 保证 nes 删除前仍能编译 |
| 6 | `packages/service/src/index.ts` | ① `caches.default` 边缘缓存 180s；② 路径白名单 `/users/ /repos/ /gists/ /orgs/ /search/`；③ 固定可识别 UA，去掉 `fake-useragent`；④ 错误响应不进缓存；⑤ `x-classy-cache: HIT/MISS` 便于排查 | 实测代理是匿名 60 次/小时且**完全没缓存**（`cf-cache-status: DYNAMIC`），出口 IP 池里已有被打满的 IP；原 `/*` 全量转发等于开放代理 |
| 7 | `packages/service/package.json` | 移除 `fake-useragent`、`@types/fake-useragent`、`create-cloudflare`；加 `typecheck` 脚本 | 前两个是 2017 年的无人维护包，且随机 UA 反而更容易被 GitHub 判滥用；`create-cloudflare` 是脚手架 CLI，不该进依赖 |
| 8 | `packages/service/wrangler.toml` | `name` 改为 `classy-api`；注释掉 `api.classygit.me` 路由；`workers_dev = true` | 线上 worker 名是 `classy-api`（域名即证据），与 toml 里的 `api-classygit` 不一致，直接 deploy 会**新建**一个 worker；旧路由指向已失效域名会让 deploy 失败 |
| 9 | `packages/service/tsconfig.json`（新增） | 引入 `@cloudflare/workers-types` | 之前 service 没有 tsconfig，`caches` / `ExecutionContext` 全靠编辑器猜 |
| 10 | `apps/classy/tailwind.config.ts` | `mini-svg-data-uri` 改用 `require` 取导出 | **修掉一个既有的构建失败**：该包是纯 CJS 且无 `__esModule`，Tailwind 用 jiti 加载配置时不注入 interop，`import` 拿到 `undefined` → `vite build` 直接报 `_minisvgdatauri2.default.call is not a function` |
| 11 | `apps/classy/public/_redirects`（新增） | `/* /index.html 200` | SPA 深链兜底写进仓库，别再依赖 dashboard 里的隐形配置 |
| 12 | `classy.config.json` / `README.md` | 失效链接改为仓库地址 / `classy-github.pages.dev` | `docs.classygit.me`、`classygit.me` 均已 NXDOMAIN |

---

## 验证证据

### 类型检查

```
$ apps/classy/node_modules/.bin/tsc -p apps/classy --noEmit   → exit 0
$ apps/nes/node_modules/.bin/tsc -p apps/nes --noEmit         → exit 0
$ packages/service/node_modules/.bin/tsc -p packages/service --noEmit → exit 0
```

### 构建

```
$ cd apps/classy && vite build
✓ built in 2.23s        （修复 #10 之前：Build failed in 218ms）

$ cd apps/nes && vite build
✓ built in 1.46s

$ cd packages/service && wrangler deploy --dry-run
Total Upload: 45.61 KiB / gzip: 11.17 KiB     （移除 fake-useragent 后）
```

> 顺带量到的事实：`apps/classy/dist` 共 2.5MB，其中三个 JS chunk 分别是 972KB / 885KB / 522KB（gzip 336 + 296 + 172 ≈ 800KB）。这印证了「语法高亮 + 全量依赖进客户端」的问题，M1 起由服务端 Shiki + 岛屿架构处理。

### 代理行为（`wrangler dev --local`，清空 `.wrangler/state` 后）

```
req1: x-classy-cache: MISS
req2: x-classy-cache: HIT
req3: x-classy-cache: HIT          ← 三次请求只回源一次

/users/zzz-not-exist-9x8f → 404，且不进缓存

/evil → 403 {"message":"Path not allowed by proxy","allowed":["/users/","/repos/","/gists/","/orgs/","/search/"]}
```

### 线上现状（改动前基线，2026-11-15）

```
GET https://classy-api.dnevend.workers.dev/users/Dnevend
→ 200, x-ratelimit-limit: 60, remaining: 36, cf-cache-status: DYNAMIC

GET https://classy-api.dnevend.workers.dev//users/Dnevend
→ 403 API rate limit exceeded for 172.71.215.199   ← Cloudflare 出口 IP，已被打满

dig classygit.me / api.classygit.me / docs.classygit.me / nes.classygit.me → 全部 NXDOMAIN
```

---

## 部署

**前端（Cloudflare Pages）**

合并到 `main` 后 Pages 会自动重新构建；`_redirects` 随 `apps/classy/public` 一起打包。构建命令应为：

```
pnpm install --frozen-lockfile
pnpm build:classy        # 输出 apps/classy/dist
```

> 注意：`pnpm-lock.yaml` 本次有变更（删了 3 个包），若 Pages 里配的是 `--frozen-lockfile`，必须一并提交锁文件。

**代理（Cloudflare Workers）**

```
cd packages/service
pnpm deploy     # wrangler deploy --minify src/index.ts
```

部署后自检：

```bash
curl -sI https://classy-api.dnevend.workers.dev/users/Dnevend | grep -iE 'x-classy-cache|cache-control'
curl -s -o /dev/null -w '%{http_code}\n' https://classy-api.dnevend.workers.dev/evil   # 期望 403
```

---

## 已知遗留（不在 M0 范围）

| 项 | 现状 | 计划 |
|---|---|---|
| `pnpm lint` 失败 | 1 个既有 error（`pages/gists/index.tsx` 的废弃 eslint-disable）+ 4 个 shadcn 的 react-refresh warning，`--max-warnings 0` 下必然红 | M5 加 CI 时一并处理 |
| 匿名限流仍在 | 代理加了缓存后压力大幅下降，但直连 GitHub 的第一次请求仍是匿名 60/h | M1 用服务端 token 取代 |
| 失败仍是静默 | 现在至少会打日志，UI 依旧空白 | M1 引入错误态与 404 页 |
| 主题选择器只剩 default | 刻意的：其余主题尚未部署 | M2/M3 用 `?theme=` 恢复 |
| `apps/nes` 仍在 | 未删，留到 M0.5 | 删前按 `theme-contract.md` §11 抄出 3 处 |
| `docs/` 仍是 Docusaurus 模板 | 未改过 | M5 删除或重写 |

---

## 回滚

本分支改动全部是「配置 + 单文件逻辑」，无数据结构变更：

```bash
git revert --no-commit <m0-commit>   # 或直接回到 main
```

唯一有外部副作用的是 #8（worker 名对齐）：如果线上 worker 实际叫 `api-classygit`，把 `wrangler.toml` 的 `name` 改回去再部署即可。
