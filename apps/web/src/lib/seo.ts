import type { User } from '@classy/types/github';

export interface SeoMeta {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  robots?: string;
  type?: 'website' | 'profile' | 'article';
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'ClassyGit';

export const seoForProfile = ({
  user,
  userinfo,
  origin,
}: {
  user: string;
  userinfo: User;
  origin: string;
}): SeoMeta => {
  const display = userinfo.name || userinfo.login || user;
  const description =
    userinfo.bio?.trim() ||
    `${display} 的 GitHub 主页：${userinfo.public_repos} 个仓库、${userinfo.public_gists} 个 Gist。`;

  return {
    title: `${display} (@${userinfo.login}) · ${SITE_NAME}`,
    description: description.slice(0, 160),
    canonical: `${origin}/${userinfo.login}`,
    image: userinfo.avatar_url,
    // 主页默认不索引：无限、薄、高度重复的内容没有排名价值，
    // 真正要收录的是 Gist 文章（M5 再开放 opt-in）。
    robots: 'noindex, follow',
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
