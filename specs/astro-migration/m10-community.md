# M10 · 社区功能：计数器 / 留言簿 / 网站环 / 88×31 徽章

> 日期：2026-11-16　分支：`v2`

## 1. 范围

这一轮把「访客 → 站主」的社区闭环先做出来：

- **访问计数器**：页脚显示访客数，Durable Object 原子计数，不存 IP。
- **留言簿**：用一条公开 Gist 的评论做留言簿，零后端、零审核后台。
- **网站环**：opt-in 的 `/webring` 目录，页脚上一站 / 随机 / 下一站。
- **88×31 徽章**：`/badge/<user>.svg`，四套主题配色，可复制 HTML / Markdown。
- **认领基础**：`loadConfigState()` 区分「没配置 / 配置坏了 / 读取失败」，未认领页加 claim 横幅和 `/claim/<user>` 三步页。

## 2. 技术决策

| 能力 | 方案 | 理由 |
|---|---|---|
| 计数器 | Durable Object `HITS`，每个 login 一个 | 原子 `+1`；KV 并发会丢计数 |
| 站点注册表 | 现有 `USERS` KV：`site:` / `ring:` / `discover:` | 不新增资源；成员量小，list + get 足够 |
| 留言簿 | GitHub Gist comments | 零存储；GitHub 身份防 spam；审核在 GitHub |
| 徽章 | 动态 SVG | 零存储；无外部字体；可缓存 |
| 认领判断 | `loadConfigState()` + `reliable` | 明确 404 才算未认领；5xx/限流不能误删 webring 成员 |

不引入 D1。

## 3. 新增配置

```json
{
  "guestbook": { "gistId": null },
  "webring": { "enabled": false },
  "discover": { "enabled": false }
}
```

- `guestbook.gistId`：20–40 位十六进制；非法值只丢这一段。
- `webring.enabled`：加入 `/webring` 目录和页脚 widget。
- `discover.enabled`：允许 `/random` 随机推荐。
- 全部默认关闭/空。

## 4. 新增路由

| 路由 | 作用 | 缓存 |
|---|---|---|
| `GET /api/hit/<user>` | 原子 +1 / 只读计数 | no-store |
| `GET /badge/<user>.svg` | 88×31 SVG | 1 天 |
| `GET /badge/<user>` | 徽章预览 + 复制片段 | — |
| `GET /<user>/guestbook` | Gist 评论留言簿 | 300s |
| `GET /webring` | 网站环目录 + 加入说明 | 300s |
| `GET /api/ring/neighbors?user=` | 上一站 / 下一站 / 随机 | 60s |
| `GET /random` | 302 到随机 discover 站点 | no-store |
| `GET /claim/<user>` | 认领三步 + 初始配置 | — |

## 5. 关键实现

### 5.1 Durable Object 入口

`src/worker.ts` 用 `@astrojs/cloudflare/handler` 的 `handle` 包住 Astro，
同时导出 `HitCounter`。`wrangler.jsonc`：

```jsonc
"main": "./src/worker.ts",
"durable_objects": {
  "bindings": [{ "name": "HITS", "class_name": "HitCounter" }]
},
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["HitCounter"] }]
```

构建产物 `dist/server/wrangler.json` 已确认带 DO bindings/migrations，
`dist/server/entry.mjs` 里能看到 `class HitCounter`。

### 5.2 计数规则

- 同一浏览器会话只 `+1` 一次，后续 `?mode=read`；
- bot / `purpose: prefetch` 只读；
- 只给 KV 里存在 `site:<login>` 的站点计数，避免随便一个 login 创建 DO；
- 页面 HTML 缓存 300s，计数由客户端 fetch，不受缓存影响。

### 5.3 站点注册表

- 主页渲染时 `syncSite()`：`site:` 必写；`ring:` / `discover:` 按配置写或删。
- 成员开关变化立即写；标题/主题刷新 1 小时节流。
- 只有明确「没有配置」才 `removeSite()`；网络错误不清理。

### 5.4 留言簿

- 配置里的 Gist 必须 `owner.login` 等于当前用户，防止嵌入别人的评论区；
- 评论走 `renderMarkdown({ allowImages: false, highlight: false })`：
  剥掉图片/嵌入（防追踪像素），不跑 Shiki（一页几十条评论省 CPU）；
- 只读展示，发言跳 GitHub；站主在 Gist 里删评论即可。

### 5.5 网站环

- 成员少于 3 个时页脚 widget 隐藏，避免空环；
- `pickNeighbors()` 纯函数：排序、prev/next 环绕、随机不返回自己；
- `/webring` 是目录，`/random` 是 302；
- 全部 opt-in，默认关闭。

## 6. 验证

### 生产（2026-11-16）

部署：`pnpm deploy:web` → Worker version `418a81b8-c815-448a-9766-47c6e7cac0b3`。
生产 bindings：`HITS (Durable Object)` / `USERS (KV)` / `ASSETS`。

```bash
GET /Dnevend                      200, cache-control: public, s-maxage=300, x-classy-cache: HIT
GET /api/hit/Dnevend              {"count":1} → {"count":2}
GET /api/hit/antfu                {"count":null,"skipped":"unclaimed"}
GET /badge/Dnevend.svg            200 image/svg+xml, s-maxage=86400, MISS → HIT
GET /random                       302 → /webring
GET /webring                      200（暂无 opt-in 成员，显示空环）
GET /Dnevend/guestbook            200（未配置，显示 disabled）
GET /claim/antfu                  200（claim 三步）
GET /antfu                        200（未认领横幅）
GET /sitemap/1.xml                含 /webring
/  Accept-Language zh/en          中文 / 英文
```

### 本地（`astro dev` / `astro preview`，workerd）

```bash
curl -s localhost:4321/api/hit/Dnevend        # {"count":1}
curl -s localhost:4321/api/hit/Dnevend        # {"count":2}
curl -s -A 'TestBot/1.0' localhost:4321/api/hit/Dnevend  # 不增加
curl -s localhost:4321/api/hit/antfu          # {"count":null,"skipped":"unclaimed"}

curl -s localhost:4321/badge/Dnevend.svg | head -c 120
# <svg ... width="88" height="31" ...

curl -s localhost:4321/api/ring/neighbors?user=alice
# {"member":true,"count":3,"prev":...,"next":...,"random":...}
```

- `pnpm test`：markdown 13 项、config 15 项、community 7 项全绿。
- `pnpm check`：0 errors。
- `pnpm build`：成功；`dist/server` 3.4M，低于 12MB CI 阈值。
- 四套主题 × 主页 / webring / badge / claim / guestbook / repos / gists 全部 200。
- 视觉：Mac 页脚显示「N visitors + 88×31 badge」；未认领页显示 claim 横幅；
  badge 页四套变体正常；webring 页在 seed 3 个成员后显示成员卡。
- webring widget：headless 浏览器验证 `hidden` 时 computed `display:none`，
  成员 API 返回 3 个站点后显示为 flex，上一站 / 随机 / 下一站 href 均非空。
  （修复了 `.webring-widget { display:inline-flex }` 覆盖 `hidden` 的问题，
  全局补 `[hidden]{display:none!important}`。）
- 边界修复：sitemap 分页偏移减掉固定两条；badge SVG 进 86400s 边缘缓存；
  配置读取失败时不再同步 sitemap 索引；留言单条渲染失败降级为 GitHub 链接。

## 7. 已知限制

- 留言簿的「有评论」状态没有做线上 e2e（本地无可用测试 token + 测试 Gist）；
  已验证：Gist 属于本人时的空状态、别人的 Gist 返回 unavailable、评论管线的
  sanitize/去图片单元测试。
- 计数器是「会话级访客数」，不是精确 PV；允许被刷，bot 过滤只能挡大部分。
- 网站环需要至少 3 个 opt-in 站点才会在页脚出现；冷启动要手动 seed。
- webring / discover 的成员同步依赖主页被访问；改配置后最多 1 小时刷新标题/主题。
- DO 首次迁移已随生产部署应用；真实流量下的计数近似/可被刷仍是已知限制。
- 尚未做：OG 图、RSS/标签/归档、配置生成器（claim 页目前只给三步说明 + 初始 JSON）。
