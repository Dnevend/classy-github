# 主题契约（草案 v1）

> 目标：**一套数据层，N 套渲染层。** 主题只回答「长什么样」，不回答「取什么数、怎么路由、怎么被搜到」。
> 状态：草案。M2 落地为 `apps/web/src/themes/types.ts`，M3 结束后冻结。
>
> **已确认（2026-11-15）**：主题走 `?theme=<name>`，不做子域名、不做路径前缀。理由见 §4。
> **v1 已于 M2 落地**，实现细节与验证见 `m2-themes.md`；本文保留为契约的规范文本。

---

## 1. 为什么需要契约

现在的 `apps/classy` 与 `apps/nes` 是**复制关系**：两个 app 各有一份路由、一份 loader、一份取数逻辑、一份页脚。加第 3、4 套主题时，成本不是加一套皮肤，而是**复制一整个应用**。

契约要做的事：把「渲染」从「应用」里剥出来，让 4 套主题共用一个 Astro 应用。

三条硬规则（违反任何一条，多主题就会重新退化成多副本）：

1. 主题里**不许**出现 `fetch` / 数据读取。
2. 主题里**不许**出现 SEO 逻辑（title、canonical、JSON-LD 由 `Base.astro` + `Seo.astro` 负责）。
3. 主题里**不许**出现路由跳转的构造（`href` 由页面算好传进来）。

---

## 2. 五个槽位

| 槽位 | 输入 | 职责 | 允许包含 |
|---|---|---|---|
| `Layout` | `LayoutProps` | 整页骨架：导航、页脚、`<slot/>`、引入本主题 CSS | 主题专属的 header/footer、窗口铬 |
| `ProfileCard` | `ProfileCardProps` | 头像、名字、bio、cover、关注数、Repos/Gists 入口 | 任意装饰 |
| `RepoCard` | `RepoCardProps` | 单个仓库卡片 | 任意装饰 |
| `GistCard` | `GistCardProps` | 单条 Gist 卡片 | 任意装饰 |
| `Markdown` | `MarkdownProps` | 已净化的 HTML 的排版容器 | 排版、代码块样式 |

`Layout` 之外的四个槽位都**不包含**导航，因此可以自由替换成 NES 的容器 / 95 的窗口 / Mac 的窗口。

---

## 3. 类型定义

```ts
// apps/web/src/themes/types.ts
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { User, Repo, Gist, ClassyConfig, TocEntry } from '@classy/types';

export type ThemeName = 'default' | 'nes' | 'mac' | 'win95';

/** 由 lib/config.ts 归一化后的配置：所有字段必有值 */
export type ResolvedConfig = Required<Pick<ClassyConfig, 'profile' | 'gists' | 'links'>> & {
  theme: ThemeName;
  seo: { index: boolean };
};

export interface ThemeStats {
  repos: number;
  gists: number;
  followers: number;
  following: number;
}

export interface LayoutProps {
  user: string;
  userinfo: User;
  config: ResolvedConfig;
  /** 当前主题名，主题可据此加 data-attribute 做自检 */
  theme: ThemeName;
  /** 亮/暗，与「主题」正交 */
  colorMode: 'light' | 'dark';
}

export interface ProfileCardProps {
  user: string;
  userinfo: User;
  config: ResolvedConfig;
  stats: ThemeStats;
  /** 页面算好的路由，主题不要自己拼 */
  links: { repos: string; gists: string };
}

export interface RepoCardProps {
  repo: Repo;
  href: string;
}

export interface GistCardProps {
  gist: Gist;
  href: string;
  /** 分类名（来自 gist 描述规则），没有分类时为 undefined */
  type?: string;
}

export interface MarkdownProps {
  /**
   * 已经过 remark-gfm → rehype-raw → rehype-sanitize → shiki 的 HTML。
   * 主题可以直接 set:html —— 这是全项目唯一允许 set:html 的地方。
   * 传入未净化的字符串属于安全漏洞，不要这么做。
   */
  html: string;
  toc?: TocEntry[];
  colorMode: 'light' | 'dark';
}

/** 主题必须导出的全部内容 */
export interface ThemeComponents {
  Layout: AstroComponentFactory;
  ProfileCard: AstroComponentFactory;
  RepoCard: AstroComponentFactory;
  GistCard: AstroComponentFactory;
  Markdown: AstroComponentFactory;
}
```

---

## 4. 注册表与解析

```ts
// apps/web/src/themes/index.ts
import type { ThemeComponents, ThemeName } from './types';

/**
 * 必须写成静态字面量映射：Astro/Vite 靠它做代码分割。
 * 用变量拼路径（import(`./${name}`)）会导致所有主题被打进同一个 chunk。
 */
export const themes = {
  default: () => import('./default'),
  nes: () => import('./nes'),
  mac: () => import('./mac'),
  win95: () => import('./win95'),
} satisfies Record<ThemeName, () => Promise<ThemeComponents>>;

export const DEFAULT_THEME: ThemeName = 'default';

export async function resolveTheme(param?: string | null) {
  const name = (
    param && Object.hasOwn(themes, param) ? param : DEFAULT_THEME
  ) as ThemeName;

  const components = await themes[name]();
  return { name, components };
}

/** 主题是 URL 维度，不是 cookie 维度：四套主题的 DOM 结构不同，浏览器端切不了 */
export function themeFromUrl(url: URL): ThemeName {
  const param = url.searchParams.get('theme');
  return (param && Object.hasOwn(themes, param) ? param : DEFAULT_THEME) as ThemeName;
}
```

**为什么不用 cookie / localStorage 决定主题**：缓存的是 HTML，若 cookie 参与渲染，同一 URL 就会对不同人返回不同 HTML，边缘缓存会互相污染；而且四套主题的 DOM 结构本就不同，没法靠客户端换 class 完成。cookie 只在落地页 `/` 做一次 302 到带 `?theme=` 的地址。

---

## 5. 页面怎么用（完整示例）

```astro
---
// apps/web/src/pages/[user]/index.astro
import { resolveTheme } from '../../themes';
import { getUser, getUserReadme, listRepos, listFollowers, listFollowing } from '../../lib/github';
import { loadConfig } from '../../lib/config';
import { renderMarkdown } from '../../lib/markdown';
import { seoForProfile } from '../../lib/seo';
import { themeFromUrl } from '../../themes';

export const prerender = false;

const user = Astro.params.user;
if (!user) return new Response(null, { status: 404 });

const [userinfo, config] = await Promise.all([getUser(user), loadConfig(user)]);

// lib 层对「用户不存在」返回 null，这里转成真正的 404 状态码
if (!userinfo) return new Response(null, { status: 404 });

const themeName = themeFromUrl(Astro.url);
const { components } = await resolveTheme(themeName);
const { Layout, ProfileCard, RepoCard, Markdown } = components;

const [repos, readme, followers, following] = await Promise.all([
  listRepos(user, { sort: 'updated', per_page: 100 }),
  getUserReadme(user),
  listFollowers(user),
  listFollowing(user),
]);

const html = readme ? await renderMarkdown(readme.source, readme.path) : null;
const colorMode = Astro.cookies.get('color-mode')?.value === 'dark' ? 'dark' : 'light';

Astro.response.headers.set(
  'Cache-Control',
  'public, s-maxage=300, stale-while-revalidate=3600'
);
---
<Layout
  user={user}
  userinfo={userinfo}
  config={config}
  theme={themeName}
  colorMode={colorMode}
  seo={seoForProfile({ user, userinfo, config })}
>
  <ProfileCard
    user={user}
    userinfo={userinfo}
    config={config}
    stats={{
      repos: userinfo.public_repos,
      gists: userinfo.public_gists,
      followers: followers.length,
      following: following.length,
    }}
    links={{ repos: `/${user}/repos`, gists: `/${user}/gists` }}
  />

  {html && <Markdown html={html} colorMode={colorMode} />}

  {config.profile.repos.visible && (
    <div class="grid gap-4 sm:grid-cols-2">
      {repos.slice(0, config.profile.repos.showCount).map((repo) => (
        <RepoCard repo={repo} href={`/${user}/repo/${repo.name}`} />
      ))}
    </div>
  )}
</Layout>
```

页面的责任边界：**取数 + 计算 href + 设置缓存头 + 404 判定**，然后交给主题。

---

## 6. `default` 主题样例

```astro
---
// apps/web/src/themes/default/index.ts
import './theme.css';

export { default as Layout } from './Layout.astro';
export { default as ProfileCard } from './ProfileCard.astro';
export { default as RepoCard } from './RepoCard.astro';
export { default as GistCard } from './GistCard.astro';
export { default as Markdown } from './Markdown.astro';
```

```astro
---
// apps/web/src/themes/default/Layout.astro
import Base from '../../layouts/Base.astro';
import ThemeSwitcher from '../_shared/ThemeSwitcher.astro';
import type { LayoutProps } from '../types';

const { user, userinfo, config, theme, colorMode } = Astro.props as LayoutProps;
---
<Base {colorMode} {title} {seo}>
  <header class="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur">
    <nav class="mx-auto flex h-14 items-center gap-4 px-4">
      <a href="/">ClassyGit</a>
      <a href={`/${user}/repos`}>Repos</a>
      <a href={`/${user}/gists`}>Gists</a>
      <span class="ml-auto font-bold">{userinfo.name ?? userinfo.login}</span>
    </nav>
  </header>

  <div class="relative mx-auto flex max-w-6xl gap-6 px-4 py-6">
    <main class="min-w-0 grow">
      <slot />
    </main>
  </div>

  <footer class="mt-8 border-t border-zinc-100 px-4 py-6 text-sm text-zinc-500">
    {config.links.map((link) => (
      <a href={link.href} target="_blank" rel="noopener">{link.title}</a>
    ))}
    <ThemeSwitcher current={theme} />
  </footer>
</Base>
```

```astro
---
// apps/web/src/themes/default/RepoCard.astro
import type { RepoCardProps } from '../types';
const { repo, href } = Astro.props as RepoCardProps;
---
<a
  {href}
  class="block rounded-lg border border-zinc-200 p-4 transition hover:shadow-sm dark:border-white/20"
>
  <h3 class="font-bold">{repo.name}</h3>
  {repo.description && <p class="mt-1 text-sm text-zinc-500">{repo.description}</p>}
  <div class="mt-3 flex gap-3 text-xs text-zinc-500">
    <span>★ {repo.stargazers_count}</span>
    <span>⑂ {repo.forks_count}</span>
    {repo.language && <span>{repo.language}</span>}
  </div>
</a>
```

---

## 7. `nes` 主题样例（证明纯 CSS 主题可行）

NES.css 是一套**纯 CSS** 库，不需要 React，也不产生任何客户端 JS：

```astro
---
// apps/web/src/themes/nes/index.ts
import 'nes.css/css/nes.min.css';
import './theme.css';

export { default as Layout } from './Layout.astro';
export { default as ProfileCard } from './ProfileCard.astro';
export { default as RepoCard } from './RepoCard.astro';
export { default as GistCard } from './GistCard.astro';
export { default as Markdown } from './Markdown.astro';
```

```astro
---
// apps/web/src/themes/nes/RepoCard.astro
import type { RepoCardProps } from '../types';
const { repo, href } = Astro.props as RepoCardProps;
---
<section class="nes-container with-title is-rounded">
  <p class="title">{repo.name}</p>
  {repo.description && <p>{repo.description}</p>}
  <a class="nes-btn is-primary" {href}>查看</a>
</section>
```

同一套 props，两套完全不同的 DOM —— 这就是契约的价值。

---

## 8. CSS 隔离与分包

1. 每个主题在 `index.ts` 里 `import './theme.css'`。Astro 按页面收集 CSS，**只有用到该主题的页面才会带上它的样式**；访问 default 主题的人永远不会下载 NES.css。
2. 除 `:root` 的设计变量外，禁止在主题 CSS 里写全局元素选择器（`body {}`、`a {}`），一律用主题根节点的 class 限定：`.theme-nes a {}`。
3. 字体一律自托管（`@font-face` + `font-display: swap`），不要依赖 Google Fonts——国内访问和 LCP 都不友好。
4. 像素字体（Press Start 2P）没有中文字形，中文会 fallback；每套主题必须在 `theme.css` 里显式声明中文 fallback 链，否则 NES 主题下中文排版会崩。

---

## 9. 新增一套主题要做什么（checklist）

1. `mkdir src/themes/<name>`，加 `index.ts`、`theme.css`、5 个槽位组件。
2. 在 `themes/index.ts` 的 `themes` 字面量里登记（必须静态字面量）。
3. 在 `ThemeName` 里加名字。
4. 在 `_shared/ThemeSwitcher.astro` 的列表里加一项（或让它从 `themes` 自动派生）。
5. 本地验收：`?theme=<name>` 下 5 条路由都能渲染；DevTools Network 里不出现其他主题的 CSS。
6. 补一张 `assets/<name>-theme.png`，README 的主题表里加一行。

**不要**再新建 app，**不要**再申请子域名。

---

## 10. 反模式对照表（当前代码 → 目标）

| 现在 | 问题 | 重构后 |
|---|---|---|
| `apps/nes/src/router/loader.ts` 复制自 classy | 加主题 = 复制应用 | 只有一份 `lib/github.ts` |
| `themeDomains` 四套子域名 | 未部署的域名会把用户跳到 NXDOMAIN | `?theme=`，只有一个 origin |
| `ThemeSelect` 直接改 `location.href` | 全页跳转 + 丢状态 | 主题是链接，`href="/path?theme=x"` |
| `apps/*/src/pages/*.tsx` 里既有取数又有样式 | 边界混乱 | 取数在页面，样式在主题 |
| `MarkdownPreview` 在浏览器里渲染用户 HTML | XSS 面 | 服务端 sanitize + 静态 HTML |

---

## 11. 附录：`apps/nes` 删之前要抄出来的东西

删除前从 `apps/nes` 取这三样，其余都是复制品（git 历史可查）：

| 文件 | 取什么 |
|---|---|
| `src/globals.css` | 像素字体声明、`image-rendering: pixelated`、行高微调 |
| `src/components/loading.tsx` / `select.tsx` / `button.tsx` | NES 的 markup 结构（class 组合），作为 `Layout` 与 `ThemeSwitcher` 的参考 |
| `src/pages/user.tsx` | 侧栏与主区的栅格比例（NES 主题下窄屏布局不同） |

`assets/nes-theme.png` 保留，作为视觉基准图。
