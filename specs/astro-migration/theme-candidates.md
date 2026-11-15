# 主题候选调研

> 日期：2026-11-15　目标：给 `themes/` 再挑 2–3 套「有趣且成熟」的皮肤
> 评估标准：纯 CSS 优先、许可证清晰、维护活跃、体积合理、能否塞进五槽位契约、中文可用性

---

## 已实现的四套

| 主题 | 依赖 | 体积 | 备注 |
|---|---|---|---|
| default | 无（自有 CSS） | 3.5 KB | 中性现代 |
| nes | NES.css 2.3 | 279 KB | 像素字，需 CJK 像素字体兜底 |
| win95 | 98.css 0.1.21 | 28 KB + 字体 | 立体边框，三角按钮 |
| mac | 无（手写 System 6） | 5.4 KB | 条纹标题栏 |

---

## 候选一览（数据来自 GitHub / npm，2026-11-15）

| # | 主题 | 来源 | 星标 | 最近更新 | 许可 | 纯 CSS | 体积 | 适配成本 |
|---|---|---|---|---|---|---|---|---|
| 1 | **7.css**（Windows 7 Aero） | `khang-nd/7.css` | 2,487 | 2026-09 | MIT | ✅ | 560 KB 包 | **低**（与 98.css 同套类名） |
| 2 | **TuiCss**（DOS / TUI） | `vinibiavatti1/TuiCss` | 1,993 | 2026-06 | MIT | ✅ | 未知（约 40 KB） | 中（box-drawing + 蓝底白字） |
| 3 | **Tufte CSS**（书籍排版） | `edwardtufte/tufte-css` | 6,592 | 2026-06 | MIT | ✅ | 瘦 | **低**（只改 Markdown 槽位即可） |
| 4 | **Pico.css**（classless） | `picocss/pico` | 16,813 | 2026-10 | MIT | ✅ | 19 MB 仓库 / 单文件小 | 低（可直接替换 default） |
| 5 | **LaTeX.css**（论文） | `vincentdoerig/latex-css` | 3,482 | 2026-05 | MIT | ✅ | 8.7 MB 包 | 低-中 |
| 6 | **BOOTSTRA.386**（CGA/DOS） | `kristopolous/BOOTSTRA.386` | 6,880 | 2026-11 | Apache-2.0 | ⚠️ Bootstrap 3 | 大 | 高（要剥离 BS3 组件） |
| 7 | **XP.css**（Windows XP Luna） | npm `xp.css` | — | **2022-10 停更** | MIT | ✅ | 1.1 MB | 中，但**不推荐** |
| 8 | Catppuccin / Dracula | 配色方案 | 20k+ | 活跃 | MIT | — | — | 不是主题，是调色板；适合做 default 的暗色变体 |

---

## 推荐 Top 3

### 1. 7.css —— Windows 7 Aero（最省力，视觉跨度又不小）

- **为什么**：它和 98.css 是同一套类名血统（`.window` / `.title-bar` / `.window-body`），
  win95 主题的五个槽位几乎可以整份复制，只改配色与圆角/玻璃质感的差异。
  2.5k 星、最近一次更新在 2026-09，维护正常。
- **工作量**：半天。复制 `themes/win95/*` → 改类名与色板 → 加 Aero 渐变标题栏。
- **风险**：7.css 的 Aero 玻璃效果依赖 `backdrop-filter` 和渐变，暗色卡片上要调对比度；
  它的按钮默认是浅色，落在深色背景时需覆盖。

### 2. TuiCss —— DOS / TUI（和现有四套区分度最大）

- **为什么**：现有四套都是「拟物图形界面」，TuiCss 是**字符界面**（蓝底、双线框、块状光标），
  和 NES 的像素、Win 的窗口、Mac 的条纹在视觉上完全不撞。1.9k 星，2026-06 仍在更新。
- **工作量**：1 天。它的容器是 ASCII 双线框，需要自绘 `╔═╗` 边框；正文用等宽字体。
- **风险**：中文等宽字体没有真正的 TUI 字形，只能靠「等宽 CJK + 无抗锯齿」近似；
  建议正文 `font-family: 'Fusion Pixel'`（已有的像素字体，12px 等宽感），避免再引一套字体。

### 3. Tufte CSS —— 书籍/论文排版（给 Gist 文章用，不是给主页用）

- **为什么**：它是一个**排版系统**，天生适合 `Markdown` 槽位，而不是整个页面框架。
  6.6k 星、2026-06 更新。放到这个项目里最自然的用法是「文章主题」：
  主页保持图形化主题，`/gist/:id` 切换成 Tufte 版式（宽边注、衬线正文、克制配色）。
- **工作量**：半天（只改 Markdown 槽位 + 一个 `article` 标记）。
- **风险**：Tufte 依赖边注（sidenotes）布局，窄屏会退化；需配合我们的移动端断点手动处理。
  另外它的字体是 ET Book（自带），中文字形缺失，必须配 CJK 衬线回退（宋体/思源宋体）。

> 备选：**Pico.css** 如果目标是「把 default 做得更专业」。它是 classless 的，语义化 HTML
> 直接出效果，自带暗色模式；代价是要重写一遍现有 default 的布局样式，收益主要是
> 无障碍与表单细节。可以当作 M6 的「default 升级」而不是第五套主题。

---

## 明确不推荐

- **XP.css**：npm 上停在 2022-10，GitHub 仓库迁移过（`jdan/XP.css` 只剩 10 星）。
  Windows XP 的 Luna 蓝很诱人，但拿一个停更三年的包做新主题不划算；
  如果真想要 XP，可以照 Mac 主题的做法手写（Luna 的渐变标题栏比 Aero 简单）。
- **BOOTSTRA.386**：Apache-2.0 没问题，但它绑死 Bootstrap 3 —— 为一个皮肤引入整套 BS3
  栅格与组件，和我们「纯 CSS + 五槽位」的架构冲突，删起来比写起来费劲。
- **Catppuccin / Dracula**：这是配色方案不是主题。适合作为 default 的
  `prefers-color-scheme` 变体，或给代码高亮换色（Shiki 主题），不要当第五套皮肤。

---

## 落地时要复用 / 避开的坑（前四套攒下的）

**必须复用**

1. CSS 通过 `?url` 显式注入 `Base` 的 `head` 插槽 —— 动态 import 的模块里直接
   `import './theme.css'` 产不出样式表（M3 踩过）。
2. 主题变量一律写 `:root[data-theme='x']`，否则被内联的 global.css 反杀。
3. 三方 CSS 若引字体，把字体拷进 `public/fonts/` 并改写 `@font-face` 的路径
   （98.css 的做法）；`?url` 不会重写 CSS 内的相对 URL。
4. 中文统一用 `Fusion Pixel`（已自托管，OFL），`Press Start 2P` 只留给纯拉丁装饰。

**要避开**

1. 不要在主题里写全站选择器（`[data-theme=x] a { color: inherit }` 会把按钮文字吃掉，
   M3 踩过），只给正文链接上色。
2. 第三方 CSS 可能触发 Vite 8 的 lightningcss 报错（98.css 的 `@media (not(hover))`），
   已全局改成 `cssMinify: 'esbuild'`，新主题继续受益。
3. 新主题体积要过 CI 的 12MB 守卫；NES 那套 279 KB 已经把预算吃掉一半，
   再加 TuiCss + 7.css 问题不大，但不要引带 JS 的主题库。

---

## 建议的推进顺序

1. **7.css**（半天，纯复制改造，立刻多一套高辨识度皮肤）
2. **TuiCss**（一天，视觉跨度最大，且能验证契约对「非窗口式」布局的容忍度）
3. **Tufte CSS**（半天，作为文章级排版，可能需要给契约加一个可选的 `article` 槽位）
4. Pico.css（可选，用来升级 default，而不是加第五套）
