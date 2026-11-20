import type { User } from '@classy/types/github';

export interface SeoMeta {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  /** OG 图尺寸（像素），帮助社交平台在下载前确定预览比例 */
  imageWidth?: number;
  imageHeight?: number;
  /** OG 图替代文本；会同时输出 og:image:alt 与 twitter:image:alt */
  imageAlt?: string;
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
  configured = true,
  theme = 'mac',
  defaultTheme = 'mac',
}: {
  user: string;
  userinfo: User;
  origin: string;
  /** 由 classy.config.json 的 seo.index 决定 */
  indexable?: boolean;
  /** 站点是否已认领（有自己的 classy.config.json）；未认领页面永不索引 */
  configured?: boolean;
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
    // 已认领站点默认索引（seo.index 默认为 true），显式关闭即退出；
    // 未认领页面（没有自己的 classy.config.json）永远不索引，避免批量
    // 生成陌生人的薄内容页。非默认主题（?theme=nes 等）同样不索引，
    // canonical 指回默认主题。
    robots:
      indexable && configured && theme === defaultTheme
        ? 'index, follow'
        : 'noindex, follow',
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
