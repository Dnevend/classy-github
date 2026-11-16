# M32 · 分享卡片 / OG 图封面背景

> 日期：2026-11-17　分支：`main`

## 1. 分享卡片

`ShareCard` 新增 `cover` 参数，四个主题 Layout 传入 `config.profile.cover`。

有封面时：

- 预览卡片使用 `<img class="share-card__cover">` 全幅铺底；
- 叠加深色渐变，保证白色文字可读；
- 头像加白色描边，二维码加白色外圈；
- 保留各主题原有边框（Mac 黑边、NES 白边、TUI 灰边、Win98 立体边）。

`modern-screenshot` 截取的是同一个预览节点，所以保存的 PNG 自动带上背景图。

## 2. OG 图

`/og/<user>.png` 现在会：

- 读取用户配置（`fresh`，避免旧缓存）；
- 若 `profile.cover` 存在且能取到图片，则用封面作为 1200×630 背景；
- 背景上叠加深色渐变，白字 + 半透明统计卡；
- 头像、名字、统计、页脚仍按原有信息展示；
- 没有封面时完全沿用原来的主题色版本。

注意事项：

- `workers-og` / Satori 对绝对定位图片不稳定，改用 CSS `background-image`；
- WebP 背景在 Satori 下会报错，OG 会跳过 WebP 封面并回退无封面版本；
- 当前用户封面已改为 JPEG，OG 可正常使用。

`/og/` 链接增加 `&v=2`，让社交平台重新抓取；`CACHE_VERSION` 22 → 23。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 本地 OG：1200×630 PNG，封面背景 + 深色渐变 + 白色文字。
- 分享卡预览：封面铺满、文字白色、边框保留。
- 生产部署与 CI 待补。
