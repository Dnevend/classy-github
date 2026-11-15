# M6 · TuiCss 主题 + 分享卡片 + sitemap 分片

> 分支：`v2`　日期：2026-11-15
> 范围：第五套主题（TUI）、全站分享入口、sitemap 索引分片

---

## 1. TuiCss 主题（DOS / Turbo Vision）

- 依赖 `tuicss@2.1.2`（MIT，34KB CSS）。和 98.css 一样**拷进 vendor 目录**，
  把 `@font-face` 的字体路径改到 `/fonts/perfect-dos-vga-437.ttf`（82KB，自托管）。
- 配色：`#0000a8` 蓝底 + `#a8a8a8` 灰条 + `#00a800` 绿按钮，标题栏灰底黑字。
- 字体：`DOS` 只覆盖拉丁，中文继续用已自托管的 **Fusion Pixel**，8-bit 观感统一。
- 五槽位：`USER INFO` 资料窗、`README.TXT` 正文窗、仓库卡片窗口 + `OPEN` 按钮、`▸` 前缀的 Gist 列表。

**踩坑**：TuiCss 对原生 `<nav>` 元素写了全局样式 `nav { position: fixed; width: 100% }`
（它自己的导航组件），直接把我们的页头/页脚导航拽出文档流——表现为「logo 消失、导航压在标题上」。
修法是在主题 CSS 里 `[data-theme='tui'] nav { position: static; width: auto; … }` 还原。

另外把 vendor CSS 里 `.tui-bg-*` 那批 `url(images/*.png)` 规则删了：它们引用的图片不在产物里，
只会产生一堆构建警告，而我们的配色本来也没用到它们。

## 2. 分享卡片（五套主题通用）

新增 `themes/_shared/ShareCard.astro`，插在每套主题的页脚（主题切换器旁）：

```
[分享]  ← 悬浮或点击展开
   ┌─────────────────┐
   │ 头像 名字 @handle │
   │ CLASSYGIT        │
   │ host/user        │
   ├────────┬─────────┤
   │ 保存图片 │ 复制链接 │
   └────────┴─────────┘
```

- **悬浮**：CSS `:hover` / `:focus-within`；**点击**：JS 切 `data-open`；Esc 与点外部关闭。
- **保存图片**：`<canvas>` 现画 1200×630 PNG（主题色取自 CSS 变量 `--bg/--fg/--accent`），
  头像用 `crossorigin="anonymous"` 绘制（GitHub 头像带 `access-control-allow-origin: *`，
  不会污染画布），失败时自动跳过头像只画文字。
- **复制链接**：`navigator.clipboard`，成功后按钮文案变「已复制」。
- 面板在窄屏固定为底部抽屉（`position: fixed; left/right: 12px`），避免溢出。

## 3. sitemap 分片

原来的单文件最多 1 万条，改成标准的两级结构：

```
/sitemap.xml       → <sitemapindex>，列出 /sitemap/1.xml …
/sitemap/[page].xml → 每片 5000 条，第 1 片包含首页
```

`src/pages/sitemap/[page].xml.ts` —— 注意 Astro 的 `[param]` 必须是完整路径段，
写成 `sitemap-[page].xml.ts` 会被当成字面量路由（构建产物里能看到 `/sitemap-[page].xml`）。

## 4. M5 遗留项的处理结论

| 项 | 结论 |
|---|---|
| sitemap 分片 | ✅ 本次完成 |
| OG 图（动态分享卡片） | ⏸ 仍不做：需要 satori + resvg wasm，与现有 3.2MB Worker 叠加风险大；分享需求本次用「保存图片」覆盖 |
| 字体 subset | ⏸ 本机没有 fonttools，无法在构建期裁剪；Fusion Pixel 958KB 只在像素主题加载，暂时接受 |
| CI | 已提交工作流，待 GitHub 上首次运行验证 |

---

## 验证

```
astro check        0 errors / 0 warnings（63 文件，1 hint）
astro build        dist/server 3.3M / dist/client 1.4M
线上五套主题        全部 200，share 入口各 2 处（页脚）
sitemap            /sitemap.xml → index；/sitemap/1.xml → urlset（含首页）
TUI 视觉           蓝底 DOS 屏、灰标题条、绿按钮、中文像素字体；截图核对
分享面板           展开后可见头像/名字/站点/URL + 两个按钮；窄屏转底部抽屉
```

## 遗留

- 分享面板的「保存图片」用系统字体渲染（canvas 里的 `document.fonts` 只等已加载字体），
  像素主题导出的图不会带像素字形——可以接受，若要完美需把字体注册到 canvas 前预加载。
- TUI 主题的按钮仍是 TuiCss 默认绿色，和主题色一致但饱和度高，后续可微调。
