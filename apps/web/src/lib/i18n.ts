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
    'nav.guestbook': 'Guestbook',
    'switch.language': 'Language',
    'switch.theme': 'Theme',

    'hit.visitors': '{count} visitors',
    'hit.visitorsLabel': 'visitors',
    'webring.label': 'Webring',
    'webring.prev': 'Previous site',
    'webring.next': 'Next site',
    'webring.random': 'Random site',
    'webring.join': 'Join the webring',
    'webring.title': 'ClassyGit Webring',
    'webring.desc': 'A ring of retro personal homepages. Hop from one to the next.',
    'webring.empty': 'The ring is still empty. Be one of the first three sites.',
    'webring.members': '{count} sites',
    'webring.joined': 'You are in the ring.',
    'webring.joinDesc': 'Add this to',
    'webring.joinSuffix': ':',
    'webring.joinNote': 'Your page joins after the next refresh. The footer links appear once the ring has at least 3 members.',
    'badge.label': '88×31 badge',
    'badge.title': "{name}'s ClassyGit badge",
    'badge.desc': 'A tiny 88×31 button for your site, README or blogroll.',
    'badge.html': 'HTML',
    'badge.markdown': 'Markdown',
    'badge.copy': 'Copy',
    'badge.copied': 'Copied',
    'badge.preview': 'Preview',
    'badge.get': 'Grab a badge',
    'claim.title': 'This page is generated from GitHub',
    'claim.desc': 'Make it yours in three minutes. No deploy, no login.',
    'claim.cta': 'Make it yours',
    'claim.step1': 'Fork the repository',
    'claim.step1Desc': 'Fork Dnevend/classy-github to your account.',
    'claim.step2': 'Edit classy.config.json',
    'claim.step2Desc': 'Change the theme, links and language. A broken file safely falls back to defaults.',
    'claim.step3': 'Wait a few minutes',
    'claim.step3Desc': 'The page refreshes within five minutes. No deploy, no build.',
    'claim.fork': 'Fork on GitHub',
    'claim.edit': 'Edit config',
    'claim.copy': 'Copy config',
    'claim.copied': 'Copied',
    'claim.config': 'Starter config',
    'claim.done': 'This page is already claimed.',
    'claim.doneDesc': 'You have a classy.config.json. Edit it on GitHub, or view your page.',
    'claim.back': 'View page',
    'claim.steps': 'Three steps',

    'setup.title': 'Build your config',
    'setup.desc': 'Fill the form, copy the JSON, paste it into classy.config.json.',
    'setup.theme': 'Theme',
    'setup.language': 'Language',
    'setup.links': 'Footer links',
    'setup.addLink': 'Add link',
    'setup.linkTitle': 'Title',
    'setup.linkHref': 'https://…',
    'setup.remove': 'Remove',
    'setup.profile': 'Profile',
    'setup.showCount': 'Recent repos',
    'setup.showFollowers': 'Show followers',
    'setup.showFollowing': 'Show following',
    'setup.now': 'Now',
    'setup.books': 'Reading',
    'setup.music': 'Listening',
    'setup.watching': 'Watching',
    'setup.guestbook': 'Guestbook Gist ID',
    'setup.guestbookHint': 'Create a public Gist named classy.guestbook and paste its ID. Leave empty to disable.',
    'setup.createGist': 'Create a Gist',
    'setup.community': 'Community',
    'setup.webring': 'Join the webring',
    'setup.discover': 'Allow random discovery',
    'setup.seoTitle': 'SEO',
    'setup.seo': 'Allow search engines to index my profile',
    'setup.seoHint': 'Only the default theme is indexable; other theme URLs stay noindex.',
    'setup.output': 'classy.config.json',
    'setup.copy': 'Copy JSON',
    'setup.copied': 'Copied',
    'setup.fork': 'Fork the repo',
    'setup.edit': 'Edit in my fork',
    'setup.preview': 'Open preview',
    'setup.previewHint': 'Preview reflects theme and language; links and Now apply after saving.',
    'setup.note': 'Advanced fields (cover, cardUrl, gist rules) are preserved from your current config.',
    'setup.username': 'GitHub username',
    'setup.start': 'Start',
    'setup.noUser': 'Enter a GitHub username to build a config.',
    'setup.notFound': 'User not found.',
    'setup.applied': 'Paste this into classy.config.json in your fork.',
    'recent.title': 'Recently visited',
    'recent.clear': 'Clear',
    'guestbook.title': "{name}'s guestbook",
    'guestbook.desc': 'Leave a note. Comments are hosted on GitHub, so the owner can moderate them there.',
    'guestbook.empty': 'No messages yet. Be the first to sign the guestbook.',
    'guestbook.leave': 'Leave a message on GitHub',
    'guestbook.hosted': 'Comments are hosted on GitHub.',
    'guestbook.count': '{count} messages',
    'guestbook.view': 'View on GitHub',
    'guestbook.unavailable': 'This guestbook is unavailable right now.',
    'guestbook.disabled': 'This user has not opened a guestbook yet.',
    'guestbook.back': 'Back to profile',

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
    'section.more': 'View all',
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
    'gists.createFirst': 'Create your first Gist',
    'gists.desc': '{name} · {count} public gists',
    'gists.files': '{count} files',
    'gists.rss': 'RSS feed',
    'gists.tags': 'Tags',
    'gists.allTags': 'All',
    'gists.archive': 'Archive',
    'gists.noTag': 'No gists tagged #{tag}.',
    'gists.clearTag': 'Clear filter',
    'archive.title': "{name}'s archive",
    'archive.desc': '{count} gists by month.',
    'archive.empty': 'No gists yet.',
    'archive.back': 'Back to gists',
    'gist.readingTime': '{minutes} min read',

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
    'nav.guestbook': '留言簿',
    'switch.language': '语言',
    'switch.theme': '主题',

    'hit.visitors': '第 {count} 位访客',
    'hit.visitorsLabel': '访客',
    'webring.label': '网站环',
    'webring.prev': '上一站',
    'webring.next': '下一站',
    'webring.random': '随机一站',
    'webring.join': '加入网站环',
    'webring.title': 'ClassyGit 网站环',
    'webring.desc': '一圈复古个人主页。点下一站，去别人家串门。',
    'webring.empty': '网站环还是空的。成为前三个站点之一吧。',
    'webring.members': '{count} 个站点',
    'webring.joined': '你已经在环里。',
    'webring.joinDesc': '在',
    'webring.joinSuffix': '里加上：',
    'webring.joinNote': '主页刷新后自动加入。页脚会在成员满 3 个后出现「上一站 / 随机 / 下一站」。',
    'badge.label': '88×31 徽章',
    'badge.title': '{name} 的 ClassyGit 徽章',
    'badge.desc': '一个 88×31 的小按钮，可以放到你的网站、README 或友情链接里。',
    'badge.html': 'HTML',
    'badge.markdown': 'Markdown',
    'badge.copy': '复制',
    'badge.copied': '已复制',
    'badge.preview': '预览',
    'badge.get': '拿一个徽章',
    'claim.title': '这个页面是根据 GitHub 自动生成的',
    'claim.desc': '三分钟把它变成你自己的。无需部署，无需登录。',
    'claim.cta': '把它变成你的',
    'claim.step1': 'Fork 仓库',
    'claim.step1Desc': '把 Dnevend/classy-github fork 到你的账号下。',
    'claim.step2': '改 classy.config.json',
    'claim.step2Desc': '换主题、加链接、改语言。写坏了也没关系，会自动回退默认值。',
    'claim.step3': '等几分钟',
    'claim.step3Desc': '页面最多五分钟刷新。不用部署，不用构建。',
    'claim.fork': '去 GitHub Fork',
    'claim.edit': '编辑配置',
    'claim.copy': '复制配置',
    'claim.copied': '已复制',
    'claim.config': '初始配置',
    'claim.done': '这个页面已经被认领了。',
    'claim.doneDesc': '你已经有了 classy.config.json。去 GitHub 改，或者直接看页面。',
    'claim.back': '查看页面',
    'claim.steps': '三步搞定',

    'setup.title': '配置生成器',
    'setup.desc': '填表、复制 JSON、粘进 classy.config.json 即可。',
    'setup.theme': '主题',
    'setup.language': '语言',
    'setup.links': '页脚链接',
    'setup.addLink': '加一条链接',
    'setup.linkTitle': '标题',
    'setup.linkHref': 'https://…',
    'setup.remove': '删除',
    'setup.profile': '资料卡',
    'setup.showCount': '最近仓库数',
    'setup.showFollowers': '显示关注者',
    'setup.showFollowing': '显示关注中',
    'setup.now': '近况',
    'setup.books': '在读',
    'setup.music': '在听',
    'setup.watching': '在看',
    'setup.guestbook': '留言簿 Gist ID',
    'setup.guestbookHint': '建一条公开 Gist，描述写 classy.guestbook，把 ID 粘过来；留空即关闭。',
    'setup.createGist': '创建 Gist',
    'setup.community': '社区',
    'setup.webring': '加入网站环',
    'setup.discover': '允许随机推荐',
    'setup.seoTitle': '搜索收录',
    'setup.seo': '允许搜索引擎收录主页',
    'setup.seoHint': '只有默认主题可索引，其他主题 URL 始终 noindex。',
    'setup.output': 'classy.config.json',
    'setup.copy': '复制 JSON',
    'setup.copied': '已复制',
    'setup.fork': 'Fork 仓库',
    'setup.edit': '在我的 fork 里编辑',
    'setup.preview': '打开预览',
    'setup.previewHint': '预览只反映主题和语言；链接与近况保存后生效。',
    'setup.note': 'cover、cardUrl、Gist 规则等高级字段会从当前配置保留。',
    'setup.username': 'GitHub 用户名',
    'setup.start': '开始',
    'setup.noUser': '输入 GitHub 用户名即可生成配置。',
    'setup.notFound': '找不到这个用户。',
    'setup.applied': '把这段 JSON 粘到你的 fork 的 classy.config.json 里。',
    'recent.title': '最近访问',
    'recent.clear': '清除',
    'guestbook.title': '{name} 的留言簿',
    'guestbook.desc': '留句话吧。留言托管在 GitHub 上，站主可以直接在那里管理。',
    'guestbook.empty': '还没有留言。来签第一笔。',
    'guestbook.leave': '去 GitHub 留言',
    'guestbook.hosted': '留言托管在 GitHub 上。',
    'guestbook.count': '{count} 条留言',
    'guestbook.view': '在 GitHub 查看',
    'guestbook.unavailable': '这个留言簿暂时不可用。',
    'guestbook.disabled': '这个用户还没有开留言簿。',
    'guestbook.back': '返回主页',

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
    'section.more': '查看更多',
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
    'gists.createFirst': '创建你的第一条 Gist',
    'gists.desc': '{name} · {count} 条公开 Gist',
    'gists.files': '{count} 个文件',
    'gists.rss': 'RSS 订阅',
    'gists.tags': '标签',
    'gists.allTags': '全部',
    'gists.archive': '归档',
    'gists.noTag': '没有带 #{tag} 标签的 Gist。',
    'gists.clearTag': '清除筛选',
    'archive.title': '{name} 的归档',
    'archive.desc': '共 {count} 条 Gist，按月份排列。',
    'archive.empty': '还没有 Gist。',
    'archive.back': '返回 Gist 列表',
    'gist.readingTime': '约 {minutes} 分钟',

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

/**
 * 首页没有站点主配置，首次访问按浏览器语言决定中/英。
 * 用户页不用这个：它们听站主在 classy.config.json 里设置的 language。
 */
export const localeFromAcceptLanguage = (
  value: string | null | undefined
): Locale => (/^zh\b/i.test(value ?? '') || /,\s*zh\b/i.test(value ?? '') ? 'zh' : DEFAULT_LOCALE);

export const localeSchema = z.enum(LOCALES);
