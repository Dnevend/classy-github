import type { User } from '@classy/types/github';

export interface SeoMeta {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  /** Atom / RSS 自动发现链接 */
  rss?: string;
  robots?: string;
  type?: 'website' | 'profile' | 'article';
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'ClassyGit';

export const seoForProfile = ({
  user,
  userinfo,
  origin,
  indexable = false,
  theme = 'mac',
  defaultTheme = 'mac',
}: {
  user: string;
  userinfo: User;
  origin: string;
  /** 由 classy.config.json 的 seo.index 决定 */
  indexable?: boolean;
  /** 当前访客看到的主题 */
  theme?: string;
  /** 站主配置的默认主题；只有这个主题的页面可索引 */
  defaultTheme?: string;
}): SeoMeta => {
  const display = userinfo.name || userinfo.login || user;
  const description =
    userinfo.bio?.trim() ||
    `${display} · ${userinfo.public_repos} repositories · ${userinfo.public_gists} gists`;

  return {
    title: `${display} (@${userinfo.login}) · ${SITE_NAME}`,
    description: description.slice(0, 160),
    canonical: `${origin}/${userinfo.login}`,
    image: `${origin}/og/${encodeURIComponent(userinfo.login)}.png?theme=${theme}&v=3`,
    // 默认不索引：无限、薄、高度重复的内容没有排名价值。
    // 用户在 classy.config.json 里设 `seo.index: true` 才放开；
    // 非默认主题（?theme=nes 等）永远不索引，canonical 指回默认主题。
    robots:
      indexable && theme === defaultTheme ? 'index, follow' : 'noindex, follow',
    type: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: display,
      alternateName: userinfo.login,
      description: userinfo.bio || undefined,
      image: userinfo.avatar_url,
      url: `${origin}/${userinfo.login}`,
      sameAs: [userinfo.html_url],
      jobTitle: userinfo.company || undefined,
    },
  };
};
