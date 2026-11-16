import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { Gist, Repo, User } from '@classy/types/github';
import type { ResolvedConfig, ThemeName } from '../lib/config';
import type { SeoMeta } from '../lib/seo';
import type { ShareCardData } from './_shared/ShareCard.astro';

/**
 * 主题契约（v1）：五个槽位。
 *
 * 硬规则：
 * 1. 主题里不许 fetch / 读数据；
 * 2. 主题里不许算 SEO（title / canonical / JSON-LD 由 Base + Seo 负责）；
 * 3. 主题里不许拼路由（href 由页面传入）。
 *
 * 唯一允许 `set:html` 的地方是 Markdown 槽位，且传入的 html
 * 必须是 lib/markdown.ts 处理过的（已 sanitize）。
 */

export interface ThemeLayoutProps {
  user: string;
  /** 用户不存在时为 null（用于 404 页） */
  userinfo: User | null;
  config: ResolvedConfig;
  theme: ThemeName;
  seo: SeoMeta;
  /** 页头右侧的署名（固定为用户显示名，切页面不变） */
  brand?: string;
  /** 分享卡片内容；不传则用用户主页信息 */
  share?: ShareCardData;
  /** 用户是否已经放了 classy.config.json（用于页脚计数/claim） */
  configured?: boolean;
}

export interface ThemeProfileCardProps {
  user: string;
  userinfo: User;
  config: ResolvedConfig;
}

export interface ThemeRepoCardProps {
  repo: Repo;
  href: string;
}

export interface ThemeGistCardProps {
  gist: Gist;
  href: string;
  /** 分类名（来自 `classy.<type>.<title>` 规则），未匹配时为 undefined */
  type?: string;
  title: string;
  /** 主页「最近片段」预览：只显示标题和日期 */
  compact?: boolean;
}

export interface ThemeMarkdownProps {
  /** 已 sanitize + 已高亮的 HTML */
  html: string;
  /** 窗口标题（文件名）；不传时各主题显示默认的 README */
  title?: string;
}

export interface ThemeComponents {
  Layout: AstroComponentFactory;
  ProfileCard: AstroComponentFactory;
  RepoCard: AstroComponentFactory;
  GistCard: AstroComponentFactory;
  Markdown: AstroComponentFactory;
}
