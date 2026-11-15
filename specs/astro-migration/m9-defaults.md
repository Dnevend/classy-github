# M9 · 默认主题切换 / 导航修复 / 近况卡片

> 日期：2026-11-16　分支：`v2`

## 1. 语言按钮回到页脚

图标保留（地球 + 当前语言），位置回到页脚，与主题切换并排。

## 2. 卡片来源：不用公共 Vercel 的方案

公共 Vercel 部署的统计卡（`github-readme-stats`、`github-profile-summary-cards` 的在线版）共享匿名配额，403 是常态。
可替代的四条路：

| 方案 | 部署形态 | 稳定性 | 备注 |
|---|---|---|---|
| **本项目的 `/card/[user]`** | 自己的 Worker | ★★★★★ | 零外部依赖、跟随主题，已内置 |
| **lowlighter/metrics** | GitHub Action，构建期渲染 SVG 提交到仓库 | ★★★★★ | 功能最全（语言、贡献、等距地图…），配置复杂 |
| **github-profile-summary-cards** | 同上（Action） | ★★★★ | 轻量，输出几张固定卡片 |
| **自建 github-readme-stats** | 自己的 Vercel / Docker + 自己的 token | ★★★★ | 生态最熟，但要维护一个服务 |

**不推荐**：任何 `*.vercel.app` 公共实例——它们不归你控制，配额被全世界的 README 共享。

为避免锁死方案，配置新增：

```json
"profile": { "cardUrl": "https://raw.githubusercontent.com/<you>/<repo>/main/card.svg" }
```

填什么就渲染什么，适合 Action 生成后提交到仓库的那种 SVG。

## 3. 导航在详情页消失（修复）

页头导航的判断条件从 `userinfo` 改成了 `user`。详情页不加载用户资料（`userinfo = null`），
所以之前导航整块被条件渲染掉了。

## 4. win95 分享按钮样式统一

`98.css` 只给 `<button>` 做了立体边框，分享面板里的「X」是 `<a>`，所以三个按钮长得不一样。
现在在 win95 主题里给 `.share-card__action`（含 a）补了同样的 2px 立体边框，并统一了触发器与语言按钮。

## 5. 首页优化

- 输入框下方加了示例用户 chips（Dnevend / antfu / sindresorhus），点击直达；
- chips 与卡片 hover 走同一套过渡；
- 标题/描述全部走 i18n，随语言切换。

## 6. mac 接管默认主题

- 注册表移除 `default`（代码目录保留，未删）；
- `?theme=` / cookie / 配置解析的兜底值改为 `mac`；
- `/Dnevend` 不带参数直接是 System 6 风格；
- `?theme=default` 仍然可用（老链接不 404），会落到 mac 之外……实际上现在会回退到 mac，等价于默认。

## 7. 「近况」卡片（在读 / 在听 / 在看）

```json
"now": {
  "books": ["《置身事内》"],
  "music": ["坂本龍一 - async"],
  "watching": ["The Bear S3"]
}
```

- 渲染在资料卡下方（统计卡之后），带书本 / 耳机 / 胶片图标；
- 三组都可以留空，留空就不显示；
- 纯文本、有长度上限（80 字 × 8 条），不影响安全边界。

---

## 验证

```
astro check      0 errors（72 文件）
线上             默认 /Dnevend → data-theme="mac"
                 /Dnevend/repo/classy-github → 页头导航存在（Repos/Gists）
                 ?theme=nes|win95|mac|tui|default 全部 200
                 页脚含地球语言按钮
首页             示例 chips 渲染正常
```

## 遗留

- 主题切换器在 mac 主题里显示成 `Nes / Win95 / Mac / Tui`（CSS capitalize），
  想统一成全小写或全大写的话在 `mac/theme.css` 里改 `text-transform`
- `now` 的条目不支持链接（比如豆瓣/Spotify），需要的话可以升级成 `{ title, url }`
