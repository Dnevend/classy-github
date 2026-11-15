# M2 · 用户配置与索引开关

> 分支：`v2`
> 日期：2026-11-15
> 范围：`classy.config.json` 的 zod 校验 + 深合并降级 + `seo.index` 开关（主题契约仍未开始）

---

## 设计

配置来自用户自己 fork 的 `<user>/classy-github` 仓库。三个原则：

1. **永不因为配置出错把站点打挂。** 之前 `classyConfig.profile.repos.showCount` 少一层就是整页白屏；
   现在任何解析失败都退回默认值。
2. **逐段降级。** `profile` 写错只丢 `profile`，`links` 里一条坏链接只丢那一条，其余照常。
3. **不信任外部输入。** `href` 只放行 `http(s)`（`javascript:` 直接丢弃），未知字段被 zod 剥掉。

### 模块拆分

| 文件 | 职责 | 能否在 node 里跑 |
|---|---|---|
| `lib/config.ts` | schema、`parseConfig()`、`DEFAULT_CONFIG` —— 纯函数 | ✅ 有单测 |
| `lib/config-loader.ts` | 取 `default_branch` → 拉 raw → 解析 → 5 分钟缓存 | 需要 Workers 运行时 |
| `lib/edge-cache.ts` | Cache API 封装（**自己记时间戳**，见下） | 可选降级 |

拆开的直接原因：`parseConfig` 要能在 `node --experimental-strip-types` 下跑断言，
而 `loadConfig` 依赖 `astro:env/server`（token）。

### 分支解析：不再死磕 `main`

原先写死 `main → master`。但 fork 的默认分支可能是任意名字（本仓库自己就改成了 `v2`），
所以现在先请求 `/repos/<user>/classy-github` 拿 `default_branch`，再按
`[default_branch, main, master]` 顺序尝试，拿不到元信息就退回 `main/master`。

### `seo.index`

```json
{ "seo": { "index": true } }
```

不写 → `noindex, follow`（默认）；写了 true → `index, follow`。
列表页、详情页仍然是 `noindex, follow`（薄内容不值得索引），只影响 `/[user]` 主页。

---

## 踩到并修掉的线上 Bug：Cache API 不会自己过期

`caches.default.match()` 返回的是「缓存里有没有」，**不是「有没有过期」**。
它会把超过 `max-age` 的条目一直给你，直到被淘汰。

后果：上一版部署的 `/Dnevend` 一直是 `HIT`，我改完配置、换了默认分支、重新部署，
线上仍然是几小时前的 HTML（token 生效后依然是 `['Github', 'Docs']` 的旧配置）。

修复：`lib/edge-cache.ts` 在写入时加 `x-classy-cached-at`，命中时自己算年龄，
超过 TTL 就当未命中；返回浏览器前删掉这个内部头。三处调用（HTML、GitHub API、配置文件）统一走它。

修复后同样的操作立刻生效：

```
/Dnevend  MISS  ['Github', '配置说明']   ← 读到了 v2 分支的新配置
/Dnevend  HIT   ['Github', '配置说明']
```

---

## 验证

### 单测（12 + 11 条断言）

```
$ pnpm --filter @classy/web test
markdown smoke ok（11 条，含 4 条 XSS 用例）
  ✓ 空配置 → 全部默认值，主页默认不索引
  ✓ null / undefined 输入不崩
  ✓ 只写一段 → 其余保持默认
  ✓ seo.index: true 生效
  ✓ javascript: 链接被丢弃，合法链接保留
  ✓ 未知字段被丢弃
  ✓ 越界的 showCount 被夹紧，而不是整段作废
  ✓ 某段结构错误 → 只回退那一段
  ✓ 非法 theme → 回退 default 并记 issue
  ✓ 合法 theme 透传
  ✓ seo.index 贯通到 robots meta
  ✓ gist 规则可覆盖，且特殊字符不会炸正则
```

### 线上

```
/Dnevend  →  footer 链接来自 v2 分支的配置：Github / 配置说明
             robots: noindex, follow（config 里没有 seo 段 → 默认不索引）
/sindresorhus → footer 无链接（该用户没有 fork classy-github → 默认配置，不冒用作者链接）
```

索引开关的线上验证见下面的提交记录（验证完已回滚）。

---

## 待办（M2 剩余部分）

- [ ] 主题契约五槽位 + `?theme=` + 每主题 CSS 分包（原计划 M2 的主要内容）
- [ ] `classy.config.json` 增加 `seo.index` 的文档说明（README / 配置示例）
- [ ] 配置里的 `theme` 字段目前只解析不生效，等主题契约落地后接上
