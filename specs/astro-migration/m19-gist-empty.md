# M19 · Gists 空状态创建入口

> 日期：2026-11-16　分支：`main`

## 变更

- `/ <user>/gists` 在 `No public gists.` 后面加「Create your first Gist ↗」，
  直达 `https://gist.github.com/`。
- 中文文案：「创建你的第一条 Gist」。
- 只有「用户完全没有 Gist」时显示；标签筛选为空仍显示「清除筛选」。
- `CACHE_VERSION` 8 → 9。

## 验证

- `pnpm check` / `pnpm build` / `pnpm test`。
- 本地 `/torvalds/gists`（无公开 Gist）显示空状态 + 创建链接；
  `/Dnevend/gists`（有 Gist）不显示。
- 生产部署与 CI 待补。
