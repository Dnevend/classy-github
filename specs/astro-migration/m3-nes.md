# M3 · NES 主题

> 分支：`v2`　日期：2026-11-15
> 范围：`themes/nes`（五槽位）+ 注册表 + `ThemeSwitcher` + 字体自托管 + 按主题分包

---

## 交付

```
src/themes/nes/
  index.ts          只导出组件（CSS 不走这里，见下面「坑 1」）
  Layout.astro      像素风页头 / 页脚，用 ?url 注入两份样式表
  ProfileCard.astro PLAYER 卡：头像 + 关注数 + 三个 nes-btn
  RepoCard.astro    nes-container with-title，标题即仓库名
  GistCard.astro    虚线分隔的列表项，分类用绿色标签
  Markdown.astro    nes-container 里套 .prose
  theme.css         设计变量覆盖 + 布局 + 中文字体兜底
public/fonts/press-start-2p.woff2   12KB，自托管
src/themes/_shared/ThemeSwitcher.astro
```

注册表加一行即可接入：

```ts
const registry = {
  default: () => import('./default'),
  nes: () => import('./nes'),
};
```

`ThemeSwitcher` 只在已注册主题数 > 1 时渲染；切换就是一次带 `?theme=` 的导航（四套主题 DOM 不同，客户端换 class 做不到）。

---

## 按主题分包（这次真正跑通了）

| 页面 | 加载的 CSS |
|---|---|
| `/Dnevend`（default） | `theme.Dmy3tlMl.css` 3.5 KB |
| `/Dnevend?theme=nes` | `nes.min.BJXkm1Cr.css` 279 KB + `theme.MUiDBiVX.css` 4.7 KB |

也就是说访问 default 主题的访客**不会**下载那 279KB 的 NES.css。这是 M2 契约里承诺的效果，M3 才第一次有真数据。

---

## 三个坑（都已修，值得留给 mac/win95）

### 坑 1：动态 import 的模块里写 `import './theme.css'`，样式会丢

`resolveTheme()` 是运行时动态 import 主题模块，Astro 在构建期收集不到这条链上的 CSS —— 表现是**页面完全没有主题样式**，而且不报错。

修法：主题 Layout 用 Vite 的 `?url` 显式引用，再通过 `Base` 的 `head` 插槽注入：

```astro
import nesCss from 'nes.css/css/nes.min.css?url';
import themeCss from './theme.css?url';
---
<Base ...>
  <Fragment slot="head">
    <link rel="stylesheet" href={nesCss} />
    <link rel="stylesheet" href={themeCss} />
  </Fragment>
```

顺手把 `Base.astro` 的 `<head>` 开了 `<slot name="head" />`，主题从此可以自己加资源。

### 坑 2：CSS 变量覆盖会被内联的 global.css 反杀

`global.css` 被 Astro 内联成 `<style>` 且**排在主题样式表之后**，于是 `:root { --fg: #18181b }` 覆盖了 `[data-theme='nes'] { --fg: #f8f9fa }`（同为 0,1,0 特异性，后者在前）。

表现：NES 页面背景是黑的，但正文文字仍是近黑色 —— 几乎看不见。

修法：变量块用 `:root[data-theme='nes']`（0,2,0）。**这条要写进主题编写的规则里。**

### 坑 3：`[data-theme='nes'] a { color: inherit }` 会把 nes-btn 变成白底白字

`.nes-btn` 靠 `color: #212529` 黑字，而 `[data-theme='nes'] a`（0,1,1）特异性高于 `.nes-btn`（0,1,0），继承来的白字盖掉了它。

修法：只给正文链接上色（`.prose a`、`.nes-links a`），不要写全站 `a` 规则。

---

## 中文字体

Press Start 2P 没有 CJK 字形，直接全站套用会让中文掉到不可控的 fallback。策略：

- **像素字体只用于**：导航按钮、徽标、统计标签、仓库名、日期。
- **中文字体栈用于**：正文（`.prose`）、简介、仓库描述、页面标题。

```css
--nes-cjk: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
```

标题里中英混排（`Dnevend 的 Gist`）尤其明显：像素字体的 x-height 和中文字形差太多，所以标题整体走中文字体，观感才统一。

---

## 验证

```
astro check              0 errors / 0 warnings（41 文件）
pnpm test                markdown 11 条 + config 14 条
astro build              dist/server 3.1M，dist/client 只有 nes.min / theme.* / 字体
```

5 条路由 × NES：全部 200，`nes-header` 存在，`theme-switcher` 存在，canonical 不含 `?theme=`。

```
/Dnevend?theme=nes                           200  canon=/Dnevend
/Dnevend/repos?theme=nes                     200  canon=/Dnevend/repos
/Dnevend/gists?theme=nes                     200  canon=/Dnevend/gists
/Dnevend/repo/classy-github?theme=nes        200
/Dnevend/gist/<id>?theme=nes                 200
```

视觉：像素描边框、PLAYER 卡、绿色标签、白底黑字按钮、页脚 DEFAULT/NES 切换器均正常。

---

## 遗留

- README 里的第三方统计图（`github-stats-extended.vercel.app`、`streak-stats.demolab.com`）经常加载不出来，是那些服务本身的问题，与主题无关；M5 可以考虑给外链图片加占位/超时降级。
- 主题切换没有做「保持滚动位置」之类的体验优化，M4 再一起看。
- NES.css 279KB 未做按需裁剪（只用了 container/btn/icon），M5 可以只引必要模块。
