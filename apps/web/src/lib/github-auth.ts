import { GITHUB_TOKEN } from 'astro:env/server';

/**
 * 是否配置了服务端 GitHub token。
 *
 * 没有 token 时调用方要退回匿名 REST（60 次/小时）；GraphQL 必须带 token，
 * 不能走匿名。
 */
export const hasGitHubToken = (): boolean => Boolean(GITHUB_TOKEN);

/**
 * 统一取 GitHub token。
 *
 * Phase 3 接 GitHub App installation token 时只改这里，REST / GraphQL / contrib
 * 都不需要再各自读 `GITHUB_TOKEN`。
 */
export const getGitHubToken = async (): Promise<string | null> =>
  GITHUB_TOKEN || null;
