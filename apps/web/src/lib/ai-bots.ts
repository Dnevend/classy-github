/**
 * 明确做 AI 抓取 / 训练的爬虫 UA。
 *
 * 这些 bot 会顺着仓库文件页无限深地爬，单个 GPTBot 就能把 5,000 points/h
 * 的 GraphQL 配额打满（2026-11-17 的线上事故就是 ClaudeBot / GPTBot 爬
 * `/repo/.../src/...` 导致的）。
 *
 * robots.txt 只是声明，Worker 里的 UA 拦截才是执行；两边共用这份名单。
 * 这里不包含 Googlebot / bingbot 等搜索爬虫，避免误伤主动开启
 * `seo.index` 的用户页。
 */
export const AI_BOT_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'cohere-ai',
  'Diffbot',
  'YouBot',
] as const;

const AI_BOT_PATTERN = new RegExp(AI_BOT_AGENTS.join('|'), 'i');

export const isAiBot = (userAgent: string | null | undefined): boolean =>
  Boolean(userAgent && AI_BOT_PATTERN.test(userAgent));
