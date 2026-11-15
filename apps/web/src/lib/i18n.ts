import { z } from 'zod';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = 'classy_lang';
export const DEFAULT_LOCALE: Locale = 'en';

/** 主题 / 页面里用到的所有文案 */
const messages = {
  en: {
    'nav.repos': 'Repos',
    'nav.gists': 'Gists',
    'nav.home': 'Home',
    'switch.language': 'Language',
    'switch.theme': 'Theme',

    'profile.followers': 'followers',
    'profile.following': 'following',
    'profile.repos': 'repos',
    'profile.gists': 'gists',
    'profile.reposTitle': 'Repos',
    'profile.gistsTitle': 'Gists',
    'profile.blog': 'Blog',
    'stats.title': 'At a glance',
    'contrib.title': 'Contribution activity',
    'now.title': 'Now',
    'now.reading': 'Reading',
    'now.listening': 'Listening',
    'now.watching': 'Watching',
    'stats.stars': 'stars',
    'stats.repos': 'repos',
    'stats.gists': 'gists',
    'stats.followers': 'followers',
    'stats.languages': 'languages',
    'profile.github': 'GitHub',
    'profile.website': 'Website',
    'profile.noReadme': 'This user has no profile README.',

    'section.recent': 'Recently updated',
    'repos.title': "{name}'s repositories",
    'repos.empty': 'No public repositories.',
    'repos.desc': '{name} · {count} public repositories',
    'seo.profileDesc': "{name}'s GitHub profile: {repos} repositories, {gists} gists.",
    'meta.notFoundUser': 'User {user} not found · ClassyGit',
    'meta.notFoundRepo': 'Repository {repo} not found · ClassyGit',
    'meta.error': 'Data unavailable · ClassyGit',
    'search.placeholder': 'Search…',
    'search.empty': 'Nothing matches.',
    'repos.prev': 'Previous',
    'repos.next': 'Next',
    'repos.page': 'Page {page} / {total}',

    'gists.title': "{name}'s gists",
    'gists.empty': 'No public gists.',
    'gists.desc': '{name} · {count} public gists',
    'gists.files': '{count} files',

    'card.open': 'Open',
    'repo.noReadme': 'This repository has no README.',
    'repo.open': 'Open on GitHub',

    'gist.files': '{count} files',
    'gist.created': 'Created {date}',
    'gist.untitled': 'Untitled gist',

    'share.trigger': 'Share',
    'share.save': 'Save image',
    'share.copy': 'Copy link',
    'share.copied': 'Copied',
    'share.twitter': 'Share on X',
    'share.tweet': '{name} on ClassyGit',

    'notfound.title': 'User not found',
    'notfound.body': 'There is no GitHub user "{user}", or the account has no public data.',
    'notfound.back': 'Back to home',
    'notfound.page': 'Page not found',

    'error.rateLimit.title': 'GitHub API rate limit',
    'error.rateLimit.body': 'The public API only allows a few anonymous requests per hour. Try again later, or set GITHUB_TOKEN.',
    'error.unknown.title': 'Data unavailable',
    'error.unknown.body': 'Something went wrong while requesting GitHub. Refreshing may help.',
    'error.retry': 'Retry',

    'landing.title': 'Your GitHub, a different way',
    'landing.subtitle': 'Type a username to get a personal homepage, code snippets and notes. No deploy, no login.',
    'landing.placeholder': 'GitHub username',
    'landing.submit': 'View',
    'landing.label': 'GitHub username',
    'landing.fork': 'Fork this repo to customize',
  },
  zh: {
    'nav.repos': '仓库',
    'nav.gists': '片段',
    'nav.home': '主页',
    'switch.language': '语言',
    'switch.theme': '主题',

    'profile.followers': '关注者',
    'profile.following': '关注中',
    'profile.repos': '仓库',
    'profile.gists': '片段',
    'profile.reposTitle': '仓库',
    'profile.gistsTitle': '片段',
    'profile.blog': '博客',
    'stats.title': '数据一览',
    'contrib.title': '贡献活跃度',
    'now.title': '近况',
    'now.reading': '在读',
    'now.listening': '在听',
    'now.watching': '在看',
    'stats.stars': '星标',
    'stats.repos': '仓库',
    'stats.gists': '片段',
    'stats.followers': '关注者',
    'stats.languages': '语言',
    'profile.github': 'GitHub',
    'profile.website': '个人网站',
    'profile.noReadme': '这个用户没有设置 profile README。',

    'section.recent': '最近更新',
    'repos.title': '{name} 的仓库',
    'repos.empty': '没有公开仓库。',
    'repos.desc': '{name} · {count} 个公开仓库',
    'seo.profileDesc': '{name} 的 GitHub 主页：{repos} 个仓库、{gists} 个 Gist。',
    'meta.notFoundUser': '找不到用户 {user} · ClassyGit',
    'meta.notFoundRepo': '找不到仓库 {repo} · ClassyGit',
    'meta.error': '数据暂时取不到 · ClassyGit',
    'search.placeholder': '搜索…',
    'search.empty': '没有匹配项。',
    'repos.prev': '上一页',
    'repos.next': '下一页',
    'repos.page': '第 {page} / {total} 页',

    'gists.title': '{name} 的 Gist',
    'gists.empty': '没有公开 Gist。',
    'gists.desc': '{name} · {count} 条公开 Gist',
    'gists.files': '{count} 个文件',

    'card.open': '打开',
    'repo.noReadme': '这个仓库没有 README。',
    'repo.open': '在 GitHub 打开',

    'gist.files': '{count} 个文件',
    'gist.created': '创建于 {date}',
    'gist.untitled': '未命名 Gist',

    'share.trigger': '分享',
    'share.save': '保存图片',
    'share.copy': '复制链接',
    'share.copied': '已复制',
    'share.twitter': '分享到 X',
    'share.tweet': '{name} 的 ClassyGit 主页',

    'notfound.title': '找不到这个用户',
    'notfound.body': 'GitHub 上不存在「{user}」，或者同名用户没有公开数据。',
    'notfound.back': '返回首页',
    'notfound.page': '页面不存在',

    'error.rateLimit.title': 'GitHub 接口暂时限流',
    'error.rateLimit.body': '公共接口每小时只允许少量匿名请求。稍后再试，或配置 GITHUB_TOKEN 后重试。',
    'error.unknown.title': '数据暂时取不到',
    'error.unknown.body': '请求 GitHub 时出错了。这不一定是你的问题，可以刷新重试。',
    'error.retry': '重试',

    'landing.title': '你的 GitHub，换一种打开方式',
    'landing.subtitle': '输入用户名，即刻得到个人主页、代码片段和随笔集。无需部署，无需登录。',
    'landing.placeholder': 'GitHub 用户名',
    'landing.submit': '查看',
    'landing.label': 'GitHub 用户名',
    'landing.fork': 'Fork 本仓库，自定义你的站点',
  },
} as const;

export type MessageKey = keyof (typeof messages)['en'];

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** 直接翻译（locale 已确定时用） */
export const translate = (
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string => {
  const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;

  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
};

/** 绑定某个 locale 的翻译函数 */
export const createTranslator =
  (locale: Locale): Translate =>
  (key, vars) =>
    translate(locale, key, vars);

/**
 * 语言解析：
 *   `?lang=` > cookie > config.language > 'en'
 * 前三步在页面里完成，middleware 只负责把 `?lang=` 写进 cookie 并参与缓存键。
 */
export const resolveLocale = ({
  param,
  cookie,
}: {
  param?: string | null;
  cookie?: string | null;
}): Locale | 'auto' => {
  if (isLocale(param)) return param;
  if (isLocale(cookie)) return cookie;
  return 'auto';
};

export const localeFromConfig = (value: unknown): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;

export const localeSchema = z.enum(LOCALES);
