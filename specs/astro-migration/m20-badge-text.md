# M20 · 88×31 徽章用户名不再压缩

> 日期：2026-11-16　分支：`main`

## 原因

`renderBadgeSvg()` 给 `@login` 加了：

```svg
textLength="78" lengthAdjust="spacingAndGlyphs"
```

短用户名会被强行拉宽，长用户名被压扁，字形看起来变形。

## 修复

- 去掉 `textLength` / `lengthAdjust`，让等宽字体按自然宽度渲染。
- 超长 login 截到 14 字符 + `…`，避免溢出 88px；正常用户名原样显示。
- 单测断言 SVG 不再包含 `textLength`。
- `CACHE_VERSION` 9 → 10，让 1 天缓存的旧徽章立即失效。

## 验证

- 本地 `/badge/Dnevend`：Mac / NES / Win98 / TUI 四套徽章的 `@Dnevend`
  都按自然字形显示，不再拉伸。
- `pnpm test` / `pnpm check` / `pnpm build` 通过。
- 生产部署与 CI 待补。
