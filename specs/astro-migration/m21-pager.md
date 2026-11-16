# M21 · 仓库分页只显示当前页

> 日期：2026-11-16　分支：`main`

## 原因

GitHub 的 `/users/{user}/repos` 不返回总数，只按 `per_page` 返回当前页。
之前为了显示「Page x / y」用 `page + (hasNext ? 1 : 0)` 猜总页数，
最后一页会显示错（例如第 2 页显示 2/2，但实际可能还有更多）。

## 变更

- 分页文案 `Page {page} / {total}` → `Page {page}`；
- 中文 `第 {page} / {total} 页` → `第 {page} 页`；
- 不再把 `hasNext` 拼成假的总页数；
- `CACHE_VERSION` 10 → 11。

## 验证

- `/Dnevend/repos?page=2` 显示 `Page 2` / `第 2 页`，没有 `/ 总数`。
- 上一页 / 下一页仍按 `hasNext` 正常显示。
- `pnpm check` / `pnpm build` / `pnpm test`。
- 生产部署与 CI 待补。
