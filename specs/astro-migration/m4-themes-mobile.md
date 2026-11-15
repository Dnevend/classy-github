# 主题持久化 + 首页主题化

> 分支：`v2`　日期：2026-11-15
> 起因：`?theme=` 只能随 URL 走，换页面就丢；首页完全不跟随主题

---

## 规则

优先级：**`?theme=` > cookie > default**

| 请求 | 结果 | 是否写 cookie |
|---|---|---|
| `/?theme=nes` | nes | ✅ 写 |
| `/Dnevend` + `Cookie: classy_theme=nes` | nes | — |
| `/Dnevend`（无参数无 cookie） | default | — |
| `?theme=amiga` + 合法 cookie | 用 cookie | — |

`?theme=default` 也会写 cookie —— 那是用户主动选择回默认，必须记住。

## 怎么做到不污染缓存

主题进了服务端渲染，就必须解决「缓存里的 nes HTML 被发给默认用户」：

1. **缓存键带解析后的主题**：`origin + pathname + ?theme=<resolved>`。
   一个 URL 最多 4 个条目，有界。
2. **Set-Cookie 不进缓存**：写缓存前先摘掉 `set-cookie`，返回给浏览器时再补上。
   实测缓存命中响应里没有 `set-cookie`。
3. 主题在 middleware 里解析一次，塞进 `Astro.locals.theme`，页面不再各自读 URL。

## 首页

`/` 从「预渲染静态页」改成按需渲染（`prerender = false`）：

- 用当前主题的 `Layout` 包住 hero，页脚自然带上主题切换器；
- 缓存 3600s，键同样带主题；
- 用户从首页选主题 → 写 cookie → 进任意用户页都是同一套皮肤。

代价：首页不再走静态资源，首次渲染 ~300ms（缓存后 0.3s）。对一个每天没多少访问的站点，
换来「主题跟随」是划算的；真要极致可以后续把 4 套主题的首页预渲染成 4 个文件。

## 验证

```
astro check              0 errors（53 文件）
pnpm test                config smoke 15 条（新增 1 组主题持久化断言）
线上：
  /?theme=nes            → set-cookie: classy_theme=nes; x-classy-cache: MISS
  /Dnevend + cookie=nes  → nes-header 存在（HIT）
  /Dnevend 无 cookie     → site-header（default）
  缓存命中响应            → 无 set-cookie
```

---

# M4 · Windows 95 与 Mac 主题 + 移动端

## win95

- 控件外观用 `98.css`（MIT，v0.1.21），**原样拷进 `themes/win95/vendor/98.css`**，
  只把 `@font-face` 的路径改到 `/fonts/`。
  不直接 `import '98.css/dist/98.css?url'` 的原因：CSS 里的相对字体路径不会被重写，字体会 404。
- 字体 `ms_sans_serif.woff2` 自托管（6KB）。
- 页面骨架：青色桌面、任务栏、窗口标题栏 + 三键控制、`fieldset` 统计。
- 链接按钮另写 `.w95-btn`（98.css 只给 `<button>` 做了立体边框，`<a>` 没有）。

## mac

- `system.css` 不在 npm 上（同名包是另一个项目），所以**手写** System 6 外观：
  1px 黑边 + 2px 硬阴影、条纹标题栏（`repeating-linear-gradient`）、左上角关闭框、顶部菜单栏。
- 字体走系统无衬线 + `-webkit-font-smoothing: none`，中文不会掉字形。

## 按主题分包（4 套全独立）

| 主题 | 加载的 CSS |
|---|---|
| default | `theme.Kd8dvqjY.css` 3.5 KB |
| nes | `nes.min` 279 KB + `theme.CYF8EjiW.css` 5.3 KB |
| win95 | `98.css` 27.8 KB + `theme.D_Y7xtx_.css` 6.2 KB |
| mac | `theme.5ll57_aR.css` 5.4 KB |

## 踩到的一个构建坑

`98.css` 里有一句 `@media (not(hover))`，Vite 8 默认的 lightningcss 压缩器判定为
「invalid media query」直接让构建失败。修法：`vite.build.cssMinify: 'esbuild'`。

## 移动端过查

375×812 下逐主题检查（截图 + `scrollWidth` 断言）：

- 四套主题均无横向溢出（`documentElement.scrollWidth = 359~360 < 375`）；
- 头部导航在窄屏自动换行；主内容塌成单列（断点 860/900px）；
- gist 列表的标签/日期不挤压标题；
- 顺手补了一个通用改进：README 里加载失败的第三方图片（统计卡、徽章）
  由一段内联脚本监听 `error` 事件后隐藏，避免留下大块空白。

## 遗留

- 主题切换是整页导航，没有做滚动位置保持。
- 98.css 的 `@media (not(hover))` 属于上游怪写法，我们只是绕过了压缩器，没改它。
- 首页按需渲染后，冷启动比静态多 ~300ms。
