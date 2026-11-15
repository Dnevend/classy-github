# M2 剩余部分 · 主题契约落地

> 分支：`v2`　日期：2026-11-15
> 范围：五槽位契约 + 主题注册表 + `?theme=` + 每主题 CSS/JS 分包 + default 迁入契约
> 顺带修掉一个线上 bug：部分用户的 README 一直显示不出来

---

## 结构

```
src/themes/
  types.ts          # 契约：5 个槽位 + props 类型
  index.ts          # 静态字面量注册表 + resolveTheme()
  default/
    index.ts        # 导出 5 个组件
    Layout.astro    # 页头 / 页脚 / <slot/>，引入 theme.css
    ProfileCard.astro
    RepoCard.astro
    GistCard.astro
    Markdown.astro  # 唯一允许 set:html 的地方
    theme.css       # 只在本主题的页面里被加载
src/layouts/Base.astro   # 退回「纯壳」：html/head/body + <slot/>，不再含导航页脚
```

`Base` 与 `Layout` 的职责切分：

- `Base`：`<html data-theme>`、`<head>`、`<Seo>`、全局 CSS。
- `Layout`：这一套主题的 header / main / footer 结构。

这样 NES 主题可以有自己的窗口式外框，而 SEO 逻辑只有一份。

### 页面怎么用

```ts
const { name: themeName, components } = await resolveTheme(
  Astro.url.searchParams.get('theme')
);
const { Layout, ProfileCard, RepoCard, Markdown } = components;
```

页面只负责：取数 → 算 href → 设状态码 → 交给主题。五条路由都按这个形状改写。

---

## `?theme=` 的规则

| 场景 | 行为 |
|---|---|
| 无参数 | default |
| `?theme=default` | default，canonical 指向不带参数的地址 |
| `?theme=NES` | 大小写不敏感 → nes |
| `?theme=amiga` | 回退 default |
| 主题未注册（如现在的 `nes`） | 回退 default，但缓存键仍按参数区分 |
| `seo.index: true` + `?theme=nes` | **仍然 `noindex`**（非默认主题不索引） |

缓存键从 `origin + pathname` 改成 `origin + pathname + ?theme=` —— 否则 default 的 HTML 会被当成其它主题的响应发出去。`?utm_*` 之类仍然被丢弃。

---

## 分包验证

```
dist/client/_astro/default.C6ogVAOh.css      6.5K   ← 主题 CSS 独立成块
dist/server/chunks/default_2gNXjmEJ.mjs      7.8K   ← 主题模块独立成块
```

dev 环境下页面只引两份样式：`/src/styles/global.css` 和 `/src/themes/default/theme.css`。
M3 加 NES 时，`theme.css` 会变成 `nes.*.css`，default 的访客不会下载它。

---

## 顺带修掉的线上 Bug：README 拉不到

现象：`/antfu`、`/Dnevend` 主页显示「这个用户没有设置 profile README」，但 `/Dnevend/repo/classy-github` 的 README 正常。

定位（`wrangler tail`）：

```
warn | [classy] antfu/antfu: README 拉取失败 503
       https://raw.githubusercontent.com/antfu/antfu/main/README.md
```

`raw.githubusercontent.com` 对 **Cloudflare 出口 IP** 返回 503（本地 curl 同一地址是 200，文件只有 617 字节，不是体积问题）。也就是说，README 的可用性完全取决于 GitHub CDN 对 CF IP 的心情，而且不消耗也不受我们 token 配额的控制。

修法：改走 `GET /repos/{owner}/{repo}/readme`（带 token，5000 次/小时，走我们自己的缓存），从返回的 base64 `content` 解码；只有超过 1MB 拿不到 `content` 时才退回 CDN。

顺带收益：少一次 API 调用（原来要先列 `contents` 再拉 CDN），并且 README 内容也进了 Cache API。

验证：

```
/Dnevend  prose ✓
/antfu    prose ✓（修复前 0）
/tj       prose ✓
```

---

## 验证清单

```
astro check                 0 errors / 0 warnings / 0 hints（34 文件）
pnpm --filter @classy/web test
  markdown smoke ok（11 条）
  config smoke ok（14 条，含 ?theme= 解析与非默认主题 robots）
astro build                 Complete（dist/server 3.1M / dist/client 40K）

线上：
  /Dnevend                 200  data-theme="default"
  /Dnevend?theme=default   200  canonical 指向 /Dnevend
  /Dnevend?theme=nes       200  回退 default，robots 仍 noindex
  ?theme=nes 与无参数        各自独立的缓存条目（MISS/HIT 互不影响）
  /Dnevend/repo/...        200  README prose + 2 个 shiki 代码块
```

---

## 下一步（M3）

1. `themes/nes/`：`nes.css` 是纯 CSS，`index.ts` 里 `import 'nes.css/css/nes.min.css'`，五个槽位重写 markup。
2. 在注册表加一行 `nes: () => import('./nes')`。
3. `_shared/ThemeSwitcher.astro`：列出 `themes` 里的主题，页面间跳转带 `?theme=`（切换是导航，不是运行时换 class）。
4. 中文字体 fallback：像素字体没有中文字形，必须在 NES 的 `theme.css` 里显式声明中文 fallback 链。
