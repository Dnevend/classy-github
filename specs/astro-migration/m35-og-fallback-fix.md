# M35 · 无封面 OG 图空白修复

> 日期：2026-11-17　分支：`main`

## 现象

`/og/<user>.png` 对**没有封面**的用户返回 `200 image/png`，但 body 是 0 字节。
例如 `https://classygit.pages.dev/og/Shadowzzh.png?theme=mac&v=2`。

- `Shadowzzh` 的 `classy.config.json` 封面是 WebP，被 OG 路由跳过；
- 于是走「无封面」分支，拼出 `background-image:none`；
- Satori 的 background-image 解析器只接受 gradient / `url()`，遇到 `none` 抛
  `Error: Invalid background image: "none"`；
- `ImageResponse` 是流式响应，headers（200 + `image/png`）先发出，body 再抛错，
  所以客户端看到的是空白 200，而不是 500。

`wrangler tail` 证据：

```text
url:     https://classy-web.dnevend.workers.dev/og/Shadowzzh.png?theme=mac&tail=1
outcome: exception
Error:   Invalid background image: "none"
```

## 影响范围

不是 Shadowzzh 独有：所有没有可用封面的用户都会命中同一分支。
`torvalds` / `octocat` 在修复前同样返回 0 字节；Dnevend 因为封面是 JPEG
走了「有封面」分支，才一直正常。

回归来源是 `86f4024 feat(m32)`：m32 之前外框用 `background:${palette.bg}`，
之后改成 `background-color` + `background-image`，无封面时写成了 `none`。

## 修复

- 新增 `src/lib/og-card.ts`：把 OG 卡的 HTML 拼装抽成纯函数
  `buildOgCardHtml()` / `asciiName()`，路由只负责取数据。
- 无封面时**完全不输出** `background-image` / `background-size` /
  `background-position`，也不再输出 `background:transparent`；有封面时行为不变。
- `/og/` 链接 `v=2` → `v=3`（`seo.ts` 与 repo / gist 共 4 处），
  `CACHE_VERSION` 26 → 27，让社交平台重新抓取。
- 新增 `scripts/og-smoke.ts`，断言：
  - 无封面 HTML 不含 `background-image`（也锁住不能再出现 `none`）；
  - 有封面输出 `url(data:)` + 深色渐变；
  - 头像有/无都能渲染；
  - 四套主题都能渲染；
  - 非 ASCII / 超长名字回退 login。
- `package.json` 的 `test` 链路加入 `og-smoke.ts`。

## 验证

本地：

- `pnpm --filter @classy/web test`：markdown / config / og / community 全部通过。
- `pnpm --filter @classy/web check`：0 error。
- `pnpm --filter @classy/web build`：通过。
- `astro dev` + 三个用户：

```text
/og/torvalds.png?theme=mac&v=3   200  32767 bytes  1200×630 PNG
/og/Shadowzzh.png?theme=mac&v=3  200  44693 bytes  1200×630 PNG
/og/Dnevend.png?theme=mac&v=3    200 827056 bytes  1200×630 PNG（带封面）
```

生产（Worker version `3f7a4489-b1f4-427f-90c2-190113158a3e`）：

```text
/og/torvalds.png?theme=mac&v=3   200 image/png 33252 bytes
/og/Shadowzzh.png?theme=mac&v=3  200 image/png 45345 bytes
/og/Dnevend.png?theme=mac&v=3    200 image/png 827684 bytes
/og/Shadowzzh.png?theme=mac&v=2  200 image/png 45345 bytes（题目原始 URL）
```

- 用户页 `og:image` 已输出 `v=3`（`/Dnevend`、`/Shadowzzh` 均确认）。

## 已知限制

- Shadowzzh 的封面仍是 WebP，OG 会自动跳过并输出无封面主题版；
  想要封面版需要把 `cover.webp` 换成 JPEG / PNG。
- 验证期间 GitHub token 5000 次/小时被爬虫 + 反复请求耗尽，OG 与用户页
  一度返回 503 `GitHub unavailable`；额度重置后复测通过。
