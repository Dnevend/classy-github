# M37 · 站主配置主题写入访客 cookie

> 日期：2026-11-19　分支：`fix/theme-cookie-persistence`

## 1. 问题

M34 让用户页在没有 `?theme=` / cookie 时使用 `classy.config.json` 的
`theme`，但只用于当次渲染，没有写进 cookie。访客无 cookie 时：

```text
/          mac
/qiangsi   nes    （qiangsi 配置 theme=nes）
/          mac
/qiangsi   nes
```

首页没有站主配置，固定回退 `mac`；用户页各自读配置。来回导航时主题就会
在 `mac` 和站点主题之间跳。

## 2. 方案

优先级不变：

```text
?theme= > cookie > 站主配置 theme > mac
```

用户页在没有显式 `?theme=` / cookie 时，读到的配置主题若不是 `mac`，
就写入 `classy_theme` cookie。之后首页、网站环和其他用户页都按 cookie
渲染，直到访客用 `?theme=` 或页脚主动切换。

- 沿用现有 `classy_theme`，不新增 cookie；1 年、`Path=/`、`SameSite=Lax`。
- 配置为 `mac` 的页面不写 cookie：mac 是全局默认，写进去会把访客锁在
  mac，第一次访问 Dnevend 后就看不到其他站点的 nes / tui 主题。
- `preview=1` 的同源预览 iframe 不写 cookie（middleware 的
  `isPreviewRequest` 现有逻辑）。
- 未配置用户、配置读取失败（没有旧配置可回退）不写 cookie。限流 / 网络
  失败时如果回退到 24h 内的旧主题缓存，会按旧主题渲染并写入该旧主题；
  这是现有 stale 兜底的取舍（见「已知限制」）。
- 非用户页（`/`、`/webring`、`/setup`、`/badge`、`/og` 等）不读配置、
  不写 cookie。
- 用户页子路径（`/repos`、`/gists`、`/gist/...`）同样生效。
- 缓存键已经带最终主题，HTML 输出不变；不需要升 `CACHE_VERSION`。

## 3. 实现

`src/lib/request-theme.ts` 的 `resolveRequestTheme()` 在
`resolveThemeChoice()` 之后补一条：

```ts
persist: choice.persist || (!explicit && fallback !== 'mac')
```

- `choice.persist`：`?theme=` 显式选择；
- `!explicit && fallback !== 'mac'`：站主配置的非默认主题，作为访客主题种子；
- `fallback === 'mac'` 时不写，避免锁死在默认主题。

middleware 不需要改：它已经根据 `persist` 写 cookie，并在缓存回填时把
`Set-Cookie` 从缓存里摘除、返回浏览器时补上。

## 4. 验证

### 单元 / 构建

```text
pnpm --filter @classy/web test
pnpm --filter @classy/web check
pnpm --filter @classy/web build
```

config smoke 覆盖：

- 配置 nes + 无 `?theme=` / cookie → `{ theme: 'nes', persist: true }`；
- 配置 mac → `persist: false`；
- 未配置用户 → `persist: false`；
- `?theme=` / cookie → 不读配置；
- 非用户页 → 不读配置、不写 cookie；
- 读取失败 → `mac` + `persist: false`；
- 非法 `?theme=` + 配置 nes → `persist: true`。

### 本地端到端

用 `wrangler dev` 跑构建后的 Worker（`dist/server/wrangler.json`），
`--persist-to` 指向空目录，cookie 用独立 jar：

```text
/qiangsi（冷缓存）          200  data-theme=nes  x-classy-cache=MISS
                              Set-Cookie: classy_theme=nes; Max-Age=31536000; Path=/; SameSite=Lax
/qiangsi（无 cookie，热缓存） 200  data-theme=nes  x-classy-cache=HIT
                              Set-Cookie: classy_theme=nes; Max-Age=31536000; Path=/; SameSite=Lax
/（带 nes cookie）           200  data-theme=nes  x-classy-cache=MISS  无 Set-Cookie
/woo0ood（带 nes cookie）    200  data-theme=nes  x-classy-cache=MISS  无 Set-Cookie
/Dnevend（无 cookie，配置 mac） 200 data-theme=mac  无 Set-Cookie
/octocat（无 cookie，无配置） 200  data-theme=mac  无 Set-Cookie
/qiangsi?preview=1 + same-origin 200 data-theme=nes 无 Set-Cookie，无缓存头
/qiangsi?theme=tui          200  data-theme=tui  Set-Cookie: classy_theme=tui
/（带 tui cookie）           200  data-theme=tui  无 Set-Cookie
/qiangsi?theme=amiga        200  data-theme=nes  Set-Cookie: classy_theme=nes
/setup                      200  data-theme=mac  无 Set-Cookie
```

- `?theme=amiga` 是非法值，按“没选”处理，因此会写入配置主题；
- `preview=1` 只有同源预览请求才跳过 cookie（`isPreviewRequest` 的现有
  规则），直接从 curl 裸访问 `?preview=1` 会被当成普通请求。
- 首页 → `/qiangsi` → 首页 → `/qiangsi` 的 cookie jar 复现：第一次
  `/qiangsi` 写入 `nes` 后，后续首页和再次进入 `/qiangsi` 都是 `nes`，
  不再回到 `mac`。

## 5. 已知限制

- 访客一旦有了主题 cookie，后续访问其他用户页也会保持这个主题，直到主动
  切换；这是「cookie 优先于站主配置」的直接结果。
- 配置为 mac 的页面不会覆盖访客已有的主题 cookie。
- 主题缓存有 30 分钟新鲜期 + 24 小时 stale 兜底。站主刚改主题、站点又
  恰好走 stale 路径时，少数首访者可能把旧主题写进 1 年 cookie；后台
  刷新完成后新访客会拿到新主题。要彻底避免，需要把 config-loader 的
  stale 标记一路传到主题解析。
