# M12 · OG 分享图

> 日期：2026-11-16　分支：`v2`

## 范围

- `/og/<user>.png`：1200×630 PNG，主题配色 + 头像 + 名字 / login + repos / stars / gists / followers。
- 主页 / Gist 详情 / 仓库详情的 `og:image` 指向它；`twitter:card` 自动变成 `summary_large_image`。
- 边缘缓存 1 天；同一卡片第二次请求 `x-classy-cache: HIT`。
- 只用 ASCII（login / 统计 / 固定 tagline），避免把中文字体打进 Worker；
  字体从静态资源 `ASSETS` 读 `ms_sans_serif.woff` / `_bold.woff`。

## 技术

- `workers-og`（Satori + resvg-wasm）负责 HTML → PNG；
- `paletteFor(theme)` 复用徽章 / 统计卡的主题色；
- 头像 `https://github.com/<login>.png?size=160` 转 data URI；
- 字体模块级缓存，避免每张卡片都读 ASSETS；
- `seoForProfile()` 的 `image` 改为 `/og/<login>.png?theme=<theme>`；
  非默认主题的页面仍 noindex，但 OG 图跟随访客主题。
- 顺手修了一个 SEO bug：`mac` 接管默认主题后，`seo.index: true` 的用户主页
  仍然因为 `theme === 'default'` 被判定 noindex；现在用站主配置的
  `defaultTheme` 判断。

## 验证

```bash
curl -s -o og.png -w '%{http_code} %{content_type} %{size_download}\n' \
  http://localhost:4321/og/Dnevend.png?theme=mac
# 200 image/png 64725
file og.png
# PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced
```

- 视觉：mac 卡片（像素字体、黑白边框、头像、4 个统计块）与 NES 卡片（深色 + 绿色）
  均正常；`MAC / 1984` 不再出现缺字的 `·`。
- `/Dnevend` HTML：`og:image` 指向 `/og/Dnevend.png?theme=mac`，
  `twitter:card=summary_large_image`。
- OG 响应头：`cache-control: public, s-maxage=86400`，第二次请求 `x-classy-cache: HIT`。
- `pnpm test`：config smoke 新增「只有站主默认主题可索引」；
  community smoke 9 项；`pnpm check` / `pnpm build` 通过。
- `workers-og` 让 `dist/server` 从 3.4M 涨到 5.3M，仍低于 12MB CI 阈值。

## 已知限制

- 卡片只用 ASCII；中文显示名会退回 login。
- 卡片是「用户卡」，仓库 / Gist 详情共用；后续可做 `/og/gist/<id>.png`。
- 头像或字体读取失败时降级为占位圆 / 默认字体，不保证 100% 可用。
- 生产部署与首张卡片缓存命中待上线后验证。
