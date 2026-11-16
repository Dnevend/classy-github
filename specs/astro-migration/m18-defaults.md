# M18 · 社区默认开启 + `/setup` owner

> 日期：2026-11-16　分支：`main`

## 范围

1. `webring.enabled` / `discover.enabled` 默认改为 `true`：
   - `DEFAULT_CONFIG`、`parseConfig` 缺省值、`/setup` 初始勾选、`/claim` starter 全部一致；
   - 用户不想参加时在配置里显式写 `false`。
2. `/setup` 生成的 JSON 补回 `owner`：
   - 服务端初值本来有，但客户端 `build()` 重建对象时漏了它；
   - 现在 `owner: initial.owner || user`，任何表单修改后 JSON 仍带 owner。

## 边界

- 默认开启针对**有配置的站点**（`configured:true`）；未认领的自动页面仍不会写入
  webring/discover 注册表，避免把随机访问的 GitHub 用户未经同意列进目录。
- 想退出：在 `classy.config.json` 写 `"webring": { "enabled": false }` /
  `"discover": { "enabled": false }`。
- `CACHE_VERSION` 7 → 8（footer widget 条件 / setup HTML 变了）。

## 验证

- `pnpm test`：community smoke 的默认值断言改为 `true`，并补显式 `false` 用例。
- Playwright：
  - `/setup?u=Dnevend` 输出 `owner=Dnevend`、webring/discover 勾选且 JSON `true`；
  - `/setup?u=antfu` 输出 `owner=antfu`、webring/discover 默认 `true`；
  - `/claim/antfu` starter 的 owner=antfu、webring/discover 为 true。
- 生产部署与 CI 待补。
