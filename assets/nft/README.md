# ClassyGit Pass — 四主题纪念卡

四张一套的 1024 × 1024 SVG 收藏卡，对应 ClassyGit 的四套主题：`mac` / `nes` / `win98` / `tui`。同一张版式，四种年代语言；每张只保留一个主体、一个动作、一句主题文案。

- **系列**：CLASSYGIT PASS / EST. 2026 / 2212 EDITION
- **成品**：[`src/mac.svg`](src/mac.svg)、[`src/nes.svg`](src/nes.svg)、[`src/win98.svg`](src/win98.svg)、[`src/tui.svg`](src/tui.svg)
- **位图**：[`export/mac.png`](export/mac.png)、[`export/nes.png`](export/nes.png)、[`export/win98.png`](export/win98.png)、[`export/tui.png`](export/tui.png)，均为 2048 × 2048
- **拼版**：[`export/contact-sheet.png`](export/contact-sheet.png)（四张 512 px 并排）
- **评审页**：[`preview.html`](preview.html)（浅色 / 深色背景、256 px 缩略图、单张放大）
- **可复现构建**：[`tools/build.py`](tools/build.py) + [`tools/export.sh`](tools/export.sh)

卡面不写 token 序号；底部只有 `No. ____ / 2212` 的排版位，实际编号由 metadata / 网站叠加。

---

## 1. 设计概念

### 一句话方向

**一张档案纸，四块屏幕。** 纸面、网格、页眉、版权行完全一致，像同一套印刷品；中间 896 × 500 的「plate」才是各自的时代。

| # | 主题 | 一句话概念 | 卡面标题 |
|---|---|---|---|
| 01 | mac | 把 System 6 桌面做成一张 1-bit 版画：50% 网点纸 + 一个 README 窗口 + 一台会笑的原创小电脑。 | **ONE BIT IS ENOUGH.** |
| 02 | nes | 把 GitHub 装进一盘卡带：原创 8-bit 山景、一个标签、一句 PRESS START。 | **YOUR GITHUB. PRESS START.** |
| 03 | win98 | 把产品说明做成一个「属性」对话框：青绿桌面、一个图标、一个窗口、一条任务栏。 | **DOUBLE-CLICK YOUR GITHUB.** |
| 04 | tui | 把主页做成一张 DOS 文本屏：双线框、系统信息、一个提示符、一组黄色块字。 | **README AT THE PROMPT.** |

### 这一版为什么更简

- **每张只有一个主体。** mac 只留一个 README 窗口；nes 只留一盘卡带；win98 只留一个对话框 + 一个桌面图标；tui 只留一块信息面板 + 一个提示符 + 大字。
- **删掉会变化的数据。** 计数、排名、日期、清单、版本号、时钟、文件名和大小全部不再上卡。卡面只保留固定参数：主题名、年代、系列编号、`EST. 2026`、`2212 EDITION`。
- **删掉为了显得丰富的第二层信息。** 没有第二个窗口、没有 boot log、没有文件列表、没有预览缩略图、没有作者主页的仓库 / 粉丝 / gist 数据。
- **留白承担节奏。** plate 的主体更少、更大；标题与主体之间、主体与 colophon 之间留出更大的空场。
- **一套感来自骨架，不来自堆料。** 页眉、标题锁定、plate 尺寸、版权行、编号行四张完全相同；差异只在 display face、plate 内容和 accent 色。
- **缩略图优先。** 每张 plate 仍有一个高对比主体：mac 的灰网点 + 白窗口、nes 的绿卡带、win98 的青绿 + 银灰对话框、tui 的蓝底 + 黄色大字。

### 版式网格

```text
1024 × 1024
┌──────────────────────────────────────────────┐ 40  keyline
│  24  crop marks                              │
│  ┌────────────────────────────────────────┐  │
│  │ ■ CLASSYGIT PASS      SERIES 01/04—MAC │  │ 64, baseline 85
│  │ ────────────────────────────────────── │  │ 112
│  │ SYSTEM 6 / 1-BIT / 1988                │  │ baseline 154
│  │ ONE BIT IS                             │  │ baseline 208, 56 px
│  │ ENOUGH.                                │  │ baseline 264
│  │ ■ README, rendered in one bit.         │  │ baseline 296
│  │ ┌────────────────────────────────────┐ │  │
│  │ │            896 × 500 plate         │ │  │ 320
│  │ └────────────────────────────────────┘ │  │
│  │ ────────────────────────────────────── │  │ 850
│  │ EST. 2026 / 2212 EDITION  CLASSYGIT.DEV │  │ baseline 884
│  │ ■ No. ______ / 2212                    │  │ baseline 937
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- 标题锁定：overline（12 px，+0.18 em）→ 两行 headline（约 38.5 px cap）→ 主题句（16 px）。四张基线完全一致。
- 所有文字都已转成 outline path，SVG 内没有 `<text>`，不依赖系统字体或网络字体。
- plate 外再描一次 1.5 px 统一 keyline，保证深色 plate 与浅色 plate 的边缘重量一致。
- 页脚只保留三件事：`EST. 2026 / 2212 EDITION`、`CLASSYGIT.DEV`、`No. ____ / 2212`。

---

## 2. 每张卡

### 01 · mac — ONE BIT IS ENOUGH.

**概念**：System 6 的桌面不是背景，是半调网点。1-bit 世界里没有灰色，只有黑白和密度。

**plate 内容**

- 菜单栏：`■ ClassyGit   File   Edit   View`，Fusion Pixel，纯黑。无时钟。
- 一个 `README` 窗口：原创 1-bit 小电脑，屏幕里是 `hello.`，机身下方是一张像素笑脸。
- 右侧只有通用占位：`Hi, I'm` / `@you` / `YOUR README` / 三条抽象文本线 / `OPEN`。
- 没有第二个窗口，没有仓库数、粉丝数、gist 名称或日期。
- 一个像素箭头停在窗口边缘。所有灰色都由 50% checker 或 1 px 线构成。

**文案**

| 位置 | 文案 |
|---|---|
| 页眉 | `CLASSYGIT PASS` / `SERIES 01 / 04 - MAC` |
| overline | `SYSTEM 6 / 1-BIT / 1988` |
| headline | `ONE BIT IS` / `ENOUGH.` |
| theme line | `README, rendered in one bit.` |
| plate | `hello.` / `Hi, I'm` / `@you` / `YOUR README` / `OPEN` |

---

### 02 · nes — YOUR GITHUB. PRESS START.

**概念**：不是「游戏风网页」，而是一盘真实存在的卡带。卡带标签是一张微型标题画面；没有 HUD、没有分数、没有关卡号。

**plate 内容**

- 中央卡带 340 × 380：深灰壳、亮绿标签边、4 px 像素角标、顶部 7 个脊槽、底部三道凹槽。
- 标签内：原创 8-bit 山景（阶梯山、像素太阳、星点、地面），`CLASSY` / `GIT` / `PASS`。
- 背景：两层阶梯山脊（`#2B3035` / `#3D6B2F`）、少量像素星。
- 底部只有 `▶ PRESS START`，没有 HUD、没有分数、没有多余底栏标注。
- 不使用任何 Nintendo 角色、logo、字体；卡带是通用外壳。

**文案**

| 位置 | 文案 |
|---|---|
| 页眉 | `CLASSYGIT PASS` / `SERIES 02 / 04 - NES` |
| overline | `8-BIT / CARTRIDGE / 1985` |
| headline | `YOUR GITHUB.` / `PRESS START.` |
| theme line | `README, rendered as a cartridge.` |
| plate | `CLASSY` / `GIT` / `PASS` / `PRESS START` |

---

### 03 · win98 — DOUBLE-CLICK YOUR GITHUB.

**概念**：把 ClassyGit 做成系统里的一个属性面板。青绿桌面、一个桌面图标、一个对话框、一条任务栏；所有控件都是 2 px 立体倒角，没有圆角。

**plate 内容**

- 桌面：`#008080` 平涂；左上只有一个 `My Homepage` 文档图标。
- 对话框：`ClassyGit Properties`，navy → `#1084D0` 标题渐变，右端 `_ □ X`。
- 两个标签页：`General` / `Theme`（当前）。
- 左侧 96 × 96 图标砖：navy 底、Fusion Pixel `CG`、青绿分隔线；下方只写 `ClassyGit`。
- 右侧只有两个固定字段：`System: ClassyGit` / `Theme: win98`。
- 按钮：`OK` / `Cancel`；没有预览缩略图、没有版本号、没有内容字段、没有渲染位置字段。
- 任务栏：`CG CLASSY` 按钮 + 一个 `ClassyGit` 任务；没有时钟。
- 不使用 Windows flag、Start 按钮、My Computer 或任何 Microsoft 图标。

**文案**

| 位置 | 文案 |
|---|---|
| 页眉 | `CLASSYGIT PASS` / `SERIES 03 / 04 - WIN98` |
| overline | `32-BIT / TRUE COLOR / 1998` |
| headline | `DOUBLE-CLICK` / `YOUR GITHUB.` |
| theme line | `README, rendered as a window.` |
| plate | `ClassyGit Properties` / `General` / `Theme` / `System: ClassyGit` / `Theme: win98` / `OK` / `Cancel` |

---

### 04 · tui — README AT THE PROMPT.

**概念**：不是「终端配色」，是真正的 80×25 文本屏。双线白框、灰标题条、黄色块状字、一个提示符、一条功能键状态栏。

**plate 内容**

- 顶栏：`CLASSYGIT.EXE`，右端 `– □ X` 三个矢量窗口控制符。
- 菜单只留三项：`ClassyGit`（选中灰底）/ `Theme` / `Help`。
- 左栏 `SYSTEM INFO`：THEME `tui` / MODE `TEXT` / SOURCE `GITHUB`，黄色标签 + 白值 + 点线。没有 screens 计数。
- 下方只有一个提示符：`C:\CLASSYGIT>` + 绿色块光标。没有 boot log、没有文件列表、没有文件大小。
- 右栏：自定义 5 × 7 点阵字 `CLASSY` / `GIT`（黄色），一条白线，一句 `README IS THE HOMEPAGE.`（青）。
- 底栏只保留 `F1 HELP   F10 MENU` 与 `TUI`。没有画面计数。
- 大字是手写 5 × 7 bitmap（矢量矩形），不是任何商业 DOS 字体。

**文案**

| 位置 | 文案 |
|---|---|
| 页眉 | `CLASSYGIT PASS` / `SERIES 04 / 04 - TUI` |
| overline | `TEXT MODE / 80x25 / 1987` |
| headline | `README AT` / `THE PROMPT.` |
| theme line | `README, rendered at the prompt.` |
| plate | `CLASSYGIT.EXE` / `ClassyGit` / `Theme` / `Help` / `SYSTEM INFO` / `THEME tui` / `MODE TEXT` / `SOURCE GITHUB` / `C:\CLASSYGIT>` / `CLASSY GIT` / `README IS THE HOMEPAGE.` / `F1 HELP F10 MENU` |

---

## 3. 配色

系列色取自四套主题现有的 CSS 变量，没有另起一套色系。

### 系列共用

| 色值 | 角色 |
|---|---|
| `#F2F2F2` | 系列纸面（= mac `--bg-subtle`） |
| `#0B0B0B` | 系列 ink：页眉、页脚、headline |
| `#5E5E5E` | 次级文字：overline、EST. 行 |
| `#9A9A9A` | 编号线 |
| `#FFFFFF` | 纸面高光 / mac plate 白 |

### 01 mac

| 色值 | 角色 |
|---|---|
| `#000000` | 1-bit 全部墨色 |
| `#FFFFFF` | 1-bit 全部纸色 |
| 2 px checker | 50% 网点，模拟 System 6 桌面纹理 |

### 02 nes

| 色值 | 角色 |
|---|---|
| `#212529` | plate / 主题背景 |
| `#2B3035` | 面板 / 远山 |
| `#495057` | 边框 / 脊槽 |
| `#6C757D` | 次级字 / 卡带描边 |
| `#ADB5BD` | 星点 / PASS |
| `#F8F9FA` | `GIT` |
| `#92CC41` | 主题绿 / 卡带 label / 标题 |
| `#3D6B2F` | 深绿山体 |
| `#151A14` | label 夜底 |
| `#3A3F38` | 卡带壳 |
| `#0F140F` | label 天空 |

### 03 win98

| 色值 | 角色 |
|---|---|
| `#008080` | 桌面 |
| `#C0C0C0` | 窗口面板 |
| `#FFFFFF` | 高光 / 输入框 |
| `#808080` | 中灰 / 凹陷边 / 分隔线 |
| `#404040` | 暗边 |
| `#000080` | 标题栏 navy / 图标底 |
| `#1084D0` | 标题栏渐变末端 |
| `#004F4F` | 窗口硬阴影 |

### 04 tui

| 色值 | 角色 |
|---|---|
| `#0000A8` | plate / DOS 蓝 |
| `#FFFFFF` | 双线框 / 正文 |
| `#A8A8A8` | 标题条 / 状态条 / 点线 |
| `#FFFF55` | 黄色块字 / 值标签 |
| `#55FFFF` | 青色说明行 |
| `#00A800` | 块光标 |

---

## 4. 字体

卡面所有文字都已转成路径；仓库不额外分发字体文件，SVG 也不引用任何外部字体。下列字体仅用于构建。

| 字体 | 许可证 | 用途 |
|---|---|---|
| Liberation Sans Bold / Regular / Italic | SIL OFL 1.1 | 系列页眉、页脚、mac / win98 headline、主题句 |
| Fusion Pixel 12px Prop zh-Hans | SIL OFL 1.1 | mac 菜单/窗口 microtype、win98 图标与少量 UI 字 |
| Press Start 2P | SIL OFL 1.1 | nes headline、卡带 label |
| 自定义 5 × 7 点阵 | 本项目原创 | tui 大字 `CLASSY GIT` |

- 字体文件在 `apps/web/public/fonts/`；构建时用 HarfBuzz 取 shaping、fontTools 取轮廓，再由 `SVGPathPen` 输出 `<path>`。
- mac / win98 的小字没有使用 MS Sans Serif 或 Apple 字体；win98 的 11–13 px 文字是 Fusion Pixel / Liberation Sans。
- 如果要改文案：改 `tools/build.py` 里的字符串，重新构建；直接改 SVG 的 path 不现实。

---

## 5. IP 注意事项

这套卡只借用「年代语言」，不借用品牌资产：

- **没有** Apple / Microsoft / Nintendo 的 logo、商标字、角色、图标、开机画面或原厂字体。
- `MAC` / `NES` / `WIN98` / `TUI` 只作为小号主题 slug 出现在页眉，符合项目既有主题命名。
- mac 的「会笑的小电脑」是原创 1-bit 插画：屏幕里是 `hello.`，笑脸在机身正面，不是 Apple logo，也不是 Happy Mac 启动图标。
- nes 的卡带是通用外壳：没有 Nintendo 卡带脊形状的精确复制、没有游戏角色、没有 `Nintendo` 字样；`PRESS START` 是通用游戏用语。
- win98 的对话框、任务栏、图标是通用 UI 词汇的原创绘制；没有 Windows flag、`Start` 按钮、`My Computer`、`Recycle Bin` 等具体品牌元素。产品名是 `ClassyGit Properties`。
- tui 没有使用 Turbo Vision / DOS 原厂字体；大字是自绘 5 × 7 点阵。
- 最终稿没有 AI 生成位图；全部是可编辑的 SVG path / rect。AI 只用于早期方向讨论，未进入交付物。
- 卡面不写价格、收益、APY、稀有度或任何 crypto 黑话；`2212 EDITION` 只是系列总量，`No. ____` 留给链上 metadata / 网站叠加。
- 卡面不写仓库数、粉丝数、gist 名称、日期、文件名、文件大小、时钟、版本号或关卡号；这些会随用户与时间变化。

---

## 6. 构建与导出

### 依赖

- Python 3.11+
- `fonttools`、`brotli`（读 WOFF2）、`uharfbuzz`（shaping）
- Chrome / Chromium（PNG 导出）

```bash
python3 -m venv /tmp/classygit-nft-venv
/tmp/classygit-nft-venv/bin/pip install fonttools brotli uharfbuzz
/tmp/classygit-nft-venv/bin/python assets/nft/tools/build.py
```

`build.py` 会重新生成 `assets/nft/src/*.svg`。字体路径默认读取 `apps/web/public/fonts/`，Liberation Sans 从系统 `/usr/share/fonts/truetype/liberation/` 读取。

### 导出 2048 PNG

```bash
bash assets/nft/tools/export.sh
# 或指定浏览器
CHROME=chromium bash assets/nft/tools/export.sh
```

脚本用 2048 × 2048 的无头 Chrome 视口加载每张 SVG，输出到 `assets/nft/export/`，并校验 PNG 尺寸。要求 Chrome 支持 `--headless=new`。

如果环境里没有 Chrome，可用任意 SVG 渲染器按 2048 输出，例如：

```bash
resvg --width 2048 --height 2048 assets/nft/src/mac.svg assets/nft/export/mac.png
# 或
inkscape assets/nft/src/mac.svg --export-type=png --export-width=2048 --export-height=2048 \
  --export-filename=assets/nft/export/mac.png
```

### 评审页

```bash
cd assets/nft
python3 -m http.server 8000
# 打开 http://localhost:8000/preview.html
```

`preview.html` 也可以直接双击打开；本地 HTTP 更稳。点击任意卡进入放大视图，`←` / `→` 切换，`Esc` 关闭。`preview.html?zoom=nes` 可直接打开某一张。

---

## 7. 自检

- **SVG 合法性**：四张均通过 XML 解析；无 `<text>`、无 `<image>`、无 `xlink:href`、无 `http(s)` 资源、无 `@font-face`。
- **尺寸**：SVG `viewBox="0 0 1024 1024"`；PNG 均为 2048 × 2048。
- **缩略图**：在 `preview.html` 的 256 px 区块里逐张检查；四张的标题仍可读，plate 主体仍可区分。
- **对齐**：四张共用同一组基线（85 / 112 / 154 / 208 / 264 / 296 / 850 / 884 / 937）；页眉、页脚、编号线位置一致。
- **像素网格**：nes / tui / win98 的主要矩形落在整数坐标；mac 的 checker 为 4 px tile（2 px 黑 + 2 px 白）；win98 倒角统一 2 px。
- **一套感**：纸面、keyline、series mark、页眉、标题区、plate 高度、colophon 全部一致；差异只在 display face、plate 内容与 accent 色。
- **文案**：全部英文、短句、无价格 / 收益 / crypto 黑话；卡面无 token 序号，无会变化的用户数据。
- **数据清理**：`grep` 检查 `src/*.svg`、`preview.html`、`README.md` 与 `tools/build.py`，确认计数、日期、清单、时钟、版本号、文件名与大小不再出现。

---

## 8. 已知不足

- **outline 后不便改字**：为了保证自包含与跨环境一致，文字全部转路径；改文案要重新跑 `build.py`。SVG 体积因此为 97–200 KB。
- **mac 网点在非整数缩放下可能摩尔纹**：1×（1024）和 2×（2048）下是干净棋盘；浏览器 125% / 150% 缩放时会出现细密干涉，这是 1-bit 网点的固有现象。
- **更简之后的取舍**：win98 的对话框比上一版小，256 px 下能读成「Windows 窗口」，但窗口标题与字段文字只作为纹理，不可逐字阅读；mac 的 `@you` / `YOUR README` 在 256 px 下仍可读，三条抽象文本线退化为三条短横线。这是主动换取留白的结果。
- **没有做 2212 个变体**：每张图是同一版式，编号由 metadata / 网站叠加。若未来要做「一 token 一图」，可在 `No. ____` 区域注入文本并导出，但当前刻意留白。
- **`preview.html` 的放大用 `<dialog>`**：现代 Chrome / Safari / Firefox 支持；旧浏览器会退化为普通块级元素。
- **年代数字是风格参考**：1988 / 1985 / 1998 / 1987 分别对应 System 6、NES 北美上市、Windows 98、DOS VGA 的年代语境，不是产品发布日期。
- **卡带 / 对话框不做精确复刻**：刻意避开品牌 trade dress，因此比例与真实硬件 / 系统窗口并非 1:1，优先服务构图与缩略图识别。
