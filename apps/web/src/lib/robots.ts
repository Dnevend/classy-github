import { AI_BOT_AGENTS } from './ai-bots.ts';

/**
 * robots.txt 与 Worker 的 UA 拦截共用同一份 AI bot 名单。
 *
 * 除了 AI bot，还要挡住两类「无限空间」入口：
 * - `/<user>/repo/...`：仓库文件树是无限深的，爬虫会一路往下爬；
 * - `?preview=1`：绕过 HTML / 配置缓存，不能成为免费的 cache miss 放大器。
 */
export const buildRobotsTxt = (origin: string): string => {
  const aiGroups = AI_BOT_AGENTS.map(
    (agent) => `User-agent: ${agent}\nDisallow: /`
  ).join('\n\n');

  return `${aiGroups}

User-agent: *
Allow: /
# 仓库文件页是无限深的爬虫陷阱，且默认 noindex；内容以 GitHub 为准。
Disallow: /*/repo/
# 预览参数会绕过缓存，只允许同源导航使用。
Disallow: /*?preview=1
Disallow: /setup
Disallow: /claim/

# 用户主页默认 noindex（薄内容），只有 classy.config.json 里
# 显式设置 seo.index: true 的用户才会进 sitemap
Sitemap: ${origin}/sitemap.xml
`;
};
