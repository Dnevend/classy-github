# M5 · 收尾

> 分支：`v2`　日期：2026-11-15
> 范围：sitemap / robots / 用户索引、删除 v1 残留、CI、README 重写

---

## 1. 索引与 sitemap

策略没变：**用户主页默认 `noindex`**，只有 `classy.config.json` 里写 `seo.index: true` 的才收录。

需要一个「谁开了索引」的注册表 —— 用户名集合是无限的、也不能枚举 GitHub。方案：

| 组件 | 作用 |
|---|---|
| KV `USERS`（`index:<login>`） | 渲染主页时同步：开了索引就写入，关了索引就删除 |
| `lib/users-kv.ts` | `syncIndexableUser()`：先读再写，1 小时内不重复写（KV 免费额度 1000 写/天） |
| `pages/sitemap.xml.ts` | 读 KV 列表，输出 `<urlset>`，最多 1 万条 |
| `pages/robots.txt.ts` | 全站可抓 + 指向 sitemap |

**踩坑**：Astro v6 起 `Astro.locals.runtime.env` 被移除，要用
`import { env } from 'cloudflare:workers'`。原来的写法会在运行时抛
`Astro.locals.runtime.env has been removed in Astro v6`，而且**在构建产物里表现为
sitemap 路由落到 `[user]` 兜底页**（不是 500），排查时容易误判成路由优先级问题。

验证（生产）：

```bash
# 手动塞一条索引记录
wrangler kv key put --namespace-id <id> "index:testuser" '{"updatedAt":0}' --remote
curl .../sitemap.xml
#   → <loc>.../</loc>  +  <loc>.../testuser</loc>
wrangler kv key delete --namespace-id <id> "index:testuser" --remote
```

## 2. 删除 v1 残留

```
- apps/classy          旧 SPA（v1）
- apps/nes             旧 NES 主题副本
- packages/components  旧 markdown/syntax 组件
- packages/lib         旧取数/缓存层（已并入 apps/web/src/lib）
- packages/shared      旧常量/主题配置
- packages/service     旧 API 代理（M0 已下线）
- docs/                Docusaurus 模板（内容一直是脚手架示例）
- 根目录 postcss.config.js / tailwind.config.js / vite.config.ts / tsconfig*.json
```

保留 `packages/types`（GitHub 数据类型）。根 `package.json` 收敛成 5 个脚本，
依赖清零。`pnpm-lock.yaml` 从 ~18k 行降到 ~4k 行。

> 顺带发现：根目录残留的 `postcss.config.js` 会让新项目构建失败
> （`Cannot find module 'tailwindcss'`）——删掉旧目录时必须一起删配置。

## 3. CI

`.github/workflows/ci.yml`：push 到 `v2` / PR 到 `v2` `main` 时跑

```
pnpm install --frozen-lockfile
pnpm --filter @classy/web check     # astro check
pnpm --filter @classy/web test      # markdown + config smoke
pnpm --filter @classy/web build
+ Worker 目录大小守卫（> 12MB 直接失败，因为压缩后逼近 10MB 上限）
```

## 4. README 重写

从「Vite SPA + 多主题 app」的旧结构改成 v2 说明：四套主题、配置字段表、
`seo.index` 开关、部署步骤、目录结构、字体与第三方样式许可。

---

## 验证

```
astro check        0 errors / 0 warnings（56 文件）
pnpm test          markdown 11 条 + config 15 条
astro build        dist/server 3.2M / dist/client 1.3M
线上路由：
  /  /Dnevend  ?theme=nes  /repos  /gists  /repo/*  → 200
  /robots.txt  /sitemap.xml                        → 200
  不存在的用户                                      → 404
```

## 遗留

- **OG 图**没做动态生成（分享卡片目前用头像）。要做需要 `workers-og` + 一套 OG 路由，
  属于独立特性，放到下一轮。
- sitemap 单文件上限 5 万条，当前实现最多 1 万条；超过要拆 `sitemap-index.xml`。
- 主题切换不保留滚动位置。
