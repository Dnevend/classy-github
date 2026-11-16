# M11 · Atom 订阅

> 日期：2026-11-16　分支：`v2`

## 范围

- `/<user>/rss.xml`：Atom 1.0，输出全部公开 Gist，按更新时间倒序，最多 50 条。
- 自动发现：用户主页 / Gists 列表 / Gist 详情页的 `<head>` 里加
  `<link rel="alternate" type="application/atom+xml">`。
- Gists 列表页加一个 `RSS` 小按钮，可直接点开订阅地址。
- 边缘缓存 1 小时；GitHub 失败返回 503，用户不存在 404。

## 实现

- `src/lib/feed.ts`：纯函数 `buildAtomFeed()`，复用 Gist 描述规则
  （`classy.<type>.<title>`）生成标题 / 分类，XML 特殊字符统一转义。
- `src/pages/[user]/rss.xml.ts`：`loadUser` + `listGists` + `loadConfig`，
  `safeLoad` 区分限流（503）和用户不存在（404）。
- `SeoMeta.rss` + `components/Seo.astro`：自动发现链接。
- `middleware` 缓存表加 `/[user]/rss.xml` → 3600s。
- `gists.rss` 文案 + `.rss-link` 样式。

## 验证

```bash
curl -s http://localhost:4321/Dnevend/rss.xml | head
# <?xml version="1.0" encoding="utf-8"?>
# <feed xmlns="http://www.w3.org/2005/Atom" ...>
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  http://localhost:4321/Dnevend/rss.xml
# 200 application/atom+xml; charset=utf-8
```

- `pnpm test`：community smoke 新增 Atom 断言（排序、转义、分类），9 项全绿。
- `pnpm check` / `pnpm build` 通过。
- 本地 feed 输出 10 条 entry；`/Dnevend/gists` 同时包含
  `rel="alternate"` 与 `.rss-link`。
- 生产部署（2026-11-16，Worker version `aced68f9-2ba0-4393-90bd-781a11a4a430`）：
  `GET /Dnevend/rss.xml` → 200 `application/atom+xml`，9 条 entry，
  `cache-control: public, s-maxage=3600`，`x-classy-cache: HIT`；
  `/Dnevend` 与 `/Dnevend/gists` 均包含自动发现链接；CI run `43821566919` 通过。

## 已知限制

- Feed 收录全部公开 Gist，还没有按 `classy.<type>` 过滤 / 标签 / 归档。
- `summary` 暂用 Gist 原始描述；后续可以换成正文摘要。
- 还没有 JSON Feed / RSS 2.0 兼容格式（Atom 已覆盖主流阅读器）。
