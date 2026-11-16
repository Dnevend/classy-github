# M13 · 标签 / 归档 / 阅读时间

> 日期：2026-11-16　分支：`v2`

## 范围

- **标签**：Gist 描述支持 `#标签`，自动从标题里剥掉；最多 8 个、每个 32 字，
  大小写不敏感去重，`C#教程` 不会被误判。
- **标签筛选**：`/<user>/gists?tag=AI` 服务端过滤；Gists 页显示标签条（Top 20）。
- **归档**：`/<user>/archive` 按年月分组列出全部 Gist，带分类标签。
- **阅读时间**：Gist 详情按中文 300 字/分钟、英文 200 词/分钟估算，向上取整。
- **Feed**：Atom entry 的 `<category>` 同时输出 type 和 tags。
- Gists 页新增 Archive 入口；标签筛选和归档都进缓存键。

## 关键实现

- `lib/gist-rule.ts`：`TAG_PATTERN = /(^|\s)#([\p{L}\p{N}_-]{1,32})/gu`，
  只在开头/空白后识别 `#`，避免 `C#教程`；`ParsedGistDescription.tags`。
- `lib/tags.ts`：`collectTagCounts()` / `hasTag()` 纯函数。
- `lib/reading.ts`：`estimateReadingMinutes()` 纯函数。
- `middleware`：`CACHE_VERSION` 3 → 5，缓存键加 `tag`；
  `/[user]/archive` 300s。
- `gists.astro`：标签条 + 服务端过滤 + 空筛选提示；`archive.astro`：年月分组。
- `gist/[id].astro`：标签 chips + 阅读时间。

## 验证

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/Dnevend/archive   # 200
curl -s 'http://localhost:4321/Dnevend/gists?tag=foo' | grep 'No gists tagged #foo'
curl -s 'http://localhost:4321/Dnevend/gists?tag=bar' | grep 'No gists tagged #bar'
curl -s http://localhost:4321/Dnevend/gist/9ec0af... | grep -E 'min read|分钟'
```

- 本地运行：archive 200，按月分组；gists 页有 Archive 入口；
  `tag=foo` / `tag=bar` 分别显示对应空状态（缓存键未串）；
  Gist 详情显示 `min read`。
- `pnpm test`：community smoke 12 项，新增标签解析 / 统计筛选 / 阅读时间 /
  Feed 多标签；`pnpm check` / `pnpm build` 通过。
- 生产部署与 CI 结果待上线后补。
