# M24 · 首页入口 / Win98 表单 / 配置精简 / showCount

> 日期：2026-11-17　分支：`main`

## 1. 移除首页 Fork 入口

首页 hero 下方的 `Fork this repo to customize ↗` 删除，保留
`Build your config · Webring · Random site` 三个入口。
`landing.fork` 文案与 `.hero-fork` 样式一并删除。

`/setup` 输出区的 `Fork the repo` 操作保留。

## 2. Win98 配置生成器表单

98.css 的规则与站点全局表单样式冲突：

- `select` 被固定为 21px 高，global 的 6px 上下内边距把文字裁掉 → 下拉框看起来是空的；
- 原生 checkbox 被 98.css 设为透明 + `position: fixed`，而本站的
  `<label class="setup-check"><input …>文字</label>` 不是 98.css 期望的
  `input + label` 结构，导致复选框完全不可见。

Win98 主题新增覆盖：

- `select` 恢复原生外观、`height: auto`、白底黑字、Win98 内凹边框；
- `.setup-check input[type='checkbox']` 恢复 13×13 可见方块，并绘制
  Win98 内凹边框与对勾。

## 3. 精简 profile 配置

删除：

- `profile.showFollowers`
- `profile.showFollowing`

关注者 / 关注中现在始终显示（四个主题都不再判断开关）。
旧配置里残留这两个字段会被 Zod 丢弃，不会报错。
`/setup` 不再生成这两个字段，README 示例同步更新。

## 4. 修复 showCount

之前主页固定只拉 30 个仓库再 `slice(0, showCount)`，所以 `showCount`
设到 30 以上没有效果。现在：

```ts
const perPage = Math.min(100, Math.max(1, showCount));
listRepos(user, { perPage });
```

`showCount` 在 0–100 范围内都能真实控制主页「最近更新」的卡片数量；
配置与页面 HTML 各有 5 分钟边缘缓存，改完后最坏约 10 分钟生效。

`classy.config.json` 里自己的 `showCount` 仍是 `6`。

## 5. cardUrl

`profile.cardUrl` 只接受 http(s) 图片 URL，最终渲染为：

```html
<img class="now-card__external" src={cardUrl} alt="" loading="lazy" />
```

- 没有自定义参数名，整串 URL 原样作为 `<img src>`；
- 查询字符串由第三方服务决定（如 GitHub Readme Stats 的
  `?username=…&theme=…`）；
- 相对路径、`data:`、`javascript:` 会被配置校验拒绝；
- 放在近况卡片底部，宽度 100%。

`CACHE_VERSION` 13 → 14。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- Win98 `/setup`：Theme / Language 下拉显示当前值；三个复选框可见、可勾选。
- 首页不再出现 `Fork this repo to customize`。
- 四主题资料卡仍显示 followers / following。
- 生产部署与 CI 待补。
