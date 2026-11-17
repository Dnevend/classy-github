import type { ConfigState } from './config-loader.ts';

/**
 * 仓库文件页只对已认领站点渲染。
 *
 * 未认领用户仍然可以看主页和仓库 README，但 `/repo/<repo>/<path>` 是无限深
 * 的 URL 空间：爬虫顺着文件树能一路爬下去，每个冷路径都要打一次 GraphQL。
 * 把深路径 302 到 GitHub，既保留可用性，也不消耗我们的配额。
 *
 * `reliable=false` 表示配置读取遇到网络 / 限流，不能据此判断「未认领」，
 * 这时放行，避免把正常站点误伤成跳转。
 */
export const shouldRedirectRepoPath = (
  state: Pick<ConfigState, 'configured' | 'reliable'>
): boolean => state.reliable && !state.configured;

/** GitHub 的 blob 地址；`HEAD` 会解析到默认分支，不需要知道分支名。 */
export const githubBlobUrl = (
  user: string,
  repo: string,
  path: string
): string => {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://github.com/${encodeURIComponent(user)}/${encodeURIComponent(
    repo
  )}/blob/HEAD/${encodedPath}`;
};
