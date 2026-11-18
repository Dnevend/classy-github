# M37 · 主页优先展示 pinned 仓库

> 日期：2026-11-18　分支：`fix/issue-3-pinned-repos`　Issue：#3

## 范围

- 用户主页 `/<username>` 的仓库区优先展示 GitHub pinned 仓库（最多 6 个）。
- pinned 少于 `profile.repos.showCount` 时，用最近更新的仓库补齐；同一仓库只出现一次。
- 有 pinned 时区块标题显示 `Pinned` / `置顶项目`，否则保持 `Recently updated` / `最近更新`。
- pin 到组织或他人仓库时，卡片链接直接去 GitHub，避免落到本站不存在的仓库详情页。
- `/repos` 列表页、无 token 的匿名 REST 路径保持原行为。

## 实现

### 数据

`PROFILE_QUERY` 增加：

```graphql
pinnedItems(first: $pinnedCount, types: [REPOSITORY]) {
  totalCount
  nodes {
    ... on Repository {
      ...仓库字段
      owner { login }
    }
  }
}
```

- `pinnedCount` 固定为 `PINNED_LIMIT = 6`（GitHub 主页最多 pin 6 个）。
- `mapPinnedRepoNode` 用节点里的 `owner.login` 生成 `full_name` 和 `owner`；
  owner 不是主页用户时用 `minimalUser` 占位。
- `mapPinnedRepos` 统一完成映射并过滤 `isPrivate`；
  `loadProfile` 的 GraphQL 分支返回 `pinnedRepos`，REST 分支返回空数组。

### 排序

新增纯函数 `src/lib/profile-repos.ts`：

```text
mergeProfileRepos(pinned, recent, limit)
  ├─ limit <= 0            → []
  ├─ 先 pinned，再 recent
  ├─ 跳过 private
  ├─ 按 full_name（小写）去重
  └─ 到 limit 截断
```

单独成模块是为了让 Node smoke 直接 import（`profile.ts` 依赖 `astro:env/server`）。
同一模块里的 `repoHref` 负责卡片链接：本人仓库走站内 `/repo/<name>`，
组织 / 他人仓库用 `repo.html_url`。

### 页面与缓存

- `pages/[user]/index.astro`：`topRepos = mergeProfileRepos(...)`；标题按是否有 pin 切换；
  `repo.owner.login` 与主页用户一致时走本地 `/repo/<name>`，否则用 `repo.html_url`。
- `i18n.ts`：新增 `section.pinned`（en `Pinned` / zh `置顶项目`）。
- `graphql.ts`：查询形状变化，缓存 key `v` 3 → 4。
- `middleware.ts`：`CACHE_VERSION` 38 → 39，`PREVIOUS_CACHE_VERSIONS` 补 `38`。

## 验证

### 本地

```text
pnpm check                         → 0 errors / 0 warnings
pnpm test                          → 全部 smoke 通过（含 profile / graphql mappers）
pnpm --filter @classy/web test:graphql → graphql smoke ok
pnpm build                         → Complete
```

运行时（本地 dev + token）：

| 页面 | 结果 |
|---|---|
| `/Dnevend` | 标题 `Pinned`；4 个 pin：classy-github、x-comfort-browser、tg-payment-bot、daily-stoic-printer |
| `/torvalds` | 标题 `Pinned`；5 个 pin + 1 个最近更新补齐（test-tlb） |
| `/octocat` | 无 pin，标题 `Recently updated`，仍按最近更新展示 |
| `/tj` | 组织 pin（apex/up、koajs/koa、clibs/clib）链接到 GitHub，本人 pin / 补齐项走本地 |

无 token（移走 `.dev.vars` 重启 dev，用未缓存的 `?theme=win98` 验证）：

```text
/Dnevend?theme=win98 → Recently updated
repos: classy-github, lead-trade-radar, dnevend.github.io, Dnevend
```

GraphQL 成本实测：把 `pinnedItems` 加进现有 profile 查询后仍为 1 point。

## 已知限制

- 无 `GITHUB_TOKEN` 的自建实例只有匿名 REST，没有 pinned 接口，退回最近更新；
  抓取 profile HTML 的兜底没有实现（类名易变，且匿名配额下还要为每个 pin 补数据）。
- GraphQL 整体失败时会退回 REST，pinned 暂时消失；与现有 README / 仓库降级路径一致。
- pinned 数据跟随 profile 查询缓存，最多 30 分钟刷新。
