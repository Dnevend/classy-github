import type { Repo } from '@classy/types/github';

import { hasGitHubToken } from './github-auth.ts';
import {
  getRepo,
  getRepoReadme,
  type ReadmeSource,
} from './github.ts';
import { ghGraphql } from './graphql.ts';
import {
  mapRepoNode,
  minimalUser,
  type GraphQLRepoDetailNode,
} from './graphql-mappers.ts';
import { REPO_DETAIL_QUERY } from './graphql-queries.ts';

export interface RepoDetailData {
  repo: Repo;
  readme: ReadmeSource | null;
}

interface RepoDetailQueryData {
  repository: GraphQLRepoDetailNode | null;
}

const loadRepoDetailRest = async (
  user: string,
  repo: string
): Promise<RepoDetailData> => {
  const [repoData, readme] = await Promise.all([
    getRepo(user, repo),
    getRepoReadme(user, repo),
  ]);

  return { repo: repoData, readme };
};

/**
 * 仓库详情页：元信息 + README。
 *
 * 有 token 时一条 GraphQL 替代 getRepo + getRepoReadme 两次 REST；
 * README 不是 README.md（比如 README.rst）或没有 README 时，才回退
 * 一次 REST 的 /readme 自动探测。
 */
export async function loadRepoDetail(
  user: string,
  repo: string,
  options: { fresh?: boolean } = {}
): Promise<RepoDetailData | null> {
  if (!hasGitHubToken()) return loadRepoDetailRest(user, repo);

  let data: RepoDetailQueryData;

  try {
    data = await ghGraphql<RepoDetailQueryData>(
      'RepoDetail',
      REPO_DETAIL_QUERY,
      { owner: user, name: repo },
      { ttl: 1800, fresh: options.fresh }
    );
  } catch (error) {
    console.warn(
      `[classy] repo GraphQL failed for ${user}/${repo}, fallback REST:`,
      (error as Error).message
    );
    return loadRepoDetailRest(user, repo);
  }

  const node = data.repository;
  if (!node) return null;

  const repoData = mapRepoNode(node, minimalUser(node.owner.login));
  const text = node.readme?.text;
  let readme: ReadmeSource | null = text
    ? {
        source: text,
        base: `https://raw.githubusercontent.com/${user}/${repo}/HEAD/`,
        path: 'README.md',
      }
    : null;

  if (!readme) {
    // README 不是 README.md（比如 README.rst）或没有 README：
    // /readme 的 404 会返回 null；限流/网络错误要冒泡，不能静默当成
    // “没有 README”。
    readme = await getRepoReadme(user, repo);
  }

  return { repo: repoData, readme };
}
