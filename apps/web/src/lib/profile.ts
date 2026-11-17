import type { Gist, Repo, User } from '@classy/types/github';

import { isNotFound } from './errors.ts';
import { hasGitHubToken } from './github-auth.ts';
import {
  getUser,
  getUserReadme,
  listGists,
  listRepos,
  type ReadmeSource,
} from './github.ts';
import { ghGraphql } from './graphql.ts';
import { singleFlight } from './single-flight.ts';
import {
  mapGistNode,
  mapRepoNode,
  mapUserNode,
  type GraphQLUserNode,
} from './graphql-mappers.ts';
import { GISTS_QUERY, OG_STATS_QUERY, PROFILE_QUERY, REPOS_QUERY, USER_INFO_QUERY } from './graphql-queries.ts';

export interface ProfileData {
  userinfo: User;
  repos: Repo[];
  readme: ReadmeSource | null;
  gists: Gist[];
}

export interface ProfileOptions {
  repoCount: number;
  gistCount: number;
  /** 预览请求绕过 GraphQL 缓存 */
  fresh?: boolean;
}

interface ProfileQueryData {
  user: GraphQLUserNode | null;
}

const clampCount = (value: number) =>
  Math.min(100, Math.max(1, Math.floor(value) || 1));

const loadProfileRest = async (
  user: string,
  options: ProfileOptions
): Promise<ProfileData | null> => {
  let userinfo: User;

  try {
    userinfo = await getUser(user);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }

  const repoCount = clampCount(options.repoCount);
  const [repos, readme, gists] = await Promise.all([
    listRepos(user, { perPage: repoCount }),
    getUserReadme(user),
    options.gistCount > 0
      ? listGists(user, clampCount(options.gistCount)).catch(() => [])
      : Promise.resolve([] as Gist[]),
  ]);

  return { userinfo, repos, readme, gists };
};

/**
 * 用户页需要的全部 GitHub 数据。
 *
 * 有 token 时用一条 GraphQL 查询（独立 5,000 points/h 配额）替代
 * user + repos + README + gists 四次 REST；没有 token 的自建实例
 * 继续走 REST 匿名配额。
 *
 * 同一 isolate 内的并发冷请求合并成一次回源，避免首发流量把配额打穿。
 */
export function loadProfile(
  user: string,
  options: ProfileOptions
): Promise<ProfileData | null> {
  const key = [
    user.toLowerCase(),
    clampCount(options.repoCount),
    clampCount(options.gistCount),
    options.fresh ? 'fresh' : 'cached',
  ].join('|');

  return singleFlight(key, () => loadProfileUncached(user, options));
}

const loadProfileUncached = async (
  user: string,
  options: ProfileOptions
): Promise<ProfileData | null> => {
  if (!hasGitHubToken()) return loadProfileRest(user, options);

  let data: ProfileQueryData;

  try {
    data = await ghGraphql<ProfileQueryData>(
      'Profile',
      PROFILE_QUERY,
      {
        login: user,
        repoCount: clampCount(options.repoCount),
        gistCount: clampCount(options.gistCount),
      },
      { ttl: 1800, fresh: options.fresh }
    );
  } catch (error) {
    // GraphQL 的 5,000 points/h 和 REST core 的 5,000/h 是两套额度。
    // GraphQL 被打满时，REST 往往还有余量；旧路径比 503 好。
    console.warn(
      `[classy] Profile GraphQL failed for ${user}, fallback REST:`,
      (error as Error).message
    );
    return loadProfileRest(user, options);
  }

  const node = data.user;
  if (!node) return null;

  const userinfo = mapUserNode(node);
  const repos = (node.repositories.nodes ?? []).map((repo) =>
    mapRepoNode(repo, userinfo)
  );
  const gists = (node.gists?.nodes ?? []).map((gist) =>
    mapGistNode(gist, userinfo)
  );
  const readmeText = node.profileRepo?.object?.text;

  const readme: ReadmeSource | null = readmeText
    ? {
        source: readmeText,
        base: `https://raw.githubusercontent.com/${userinfo.login}/${userinfo.login}/HEAD/`,
        path: 'README.md',
      }
    : null;

  return { userinfo, repos, readme, gists };
};

export interface OgStats {
  login: string;
  name: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  stars: number;
  languages: number;
}

export interface UserGistsData {
  userinfo: User;
  gists: Gist[];
}

interface UserInfoQueryData {
  user: GraphQLUserNode | null;
}

/** 只要用户资料（guestbook / claim / setup），不拉仓库和 gist 列表。 */
export async function loadUserInfo(
  user: string,
  options: { fresh?: boolean } = {}
): Promise<User | null> {
  if (!hasGitHubToken()) {
    try {
      return await getUser(user);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  const data = await ghGraphql<UserInfoQueryData>(
    'UserInfo',
    USER_INFO_QUERY,
    { login: user },
    { ttl: 1800, fresh: options.fresh }
  );

  return data.user ? mapUserNode(data.user) : null;
}

export interface ReposPageData {
  userinfo: User;
  repos: Repo[];
}

interface ReposQueryData {
  user: GraphQLUserNode | null;
}

/**
 * repos 列表第一页。
 *
 * 第二页之后仍走 REST：GraphQL 是 cursor 分页，贸然改 URL 会破坏已有
 * 链接和 HTML 缓存；先把最常访问的第一页从 REST 配额上摘下来。
 */
export async function loadReposFirstPage(
  user: string,
  options: { perPage?: number; fresh?: boolean } = {}
): Promise<ReposPageData | null> {
  const perPage = clampCount(options.perPage ?? 30);

  if (!hasGitHubToken()) {
    try {
      const userinfo = await getUser(user);
      const repos = await listRepos(user, { page: 1, perPage });
      return { userinfo, repos };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  const data = await ghGraphql<ReposQueryData>(
    'ReposPage',
    REPOS_QUERY,
    { login: user, first: perPage },
    { ttl: 1800, fresh: options.fresh }
  );

  const node = data.user;
  if (!node) return null;

  const userinfo = mapUserNode(node);

  return {
    userinfo,
    repos: (node.repositories.nodes ?? []).map((repo) =>
      mapRepoNode(repo, userinfo)
    ),
  };
}

interface UserGistsQueryData {
  user: GraphQLUserNode | null;
}

/**
 * gists / archive / RSS 共用的用户 + gist 列表读取。
 * 有 token 时一次 GraphQL，不再走 getUser + listGists 两次 REST。
 */
export async function loadUserGists(
  user: string,
  options: { gistCount?: number; fresh?: boolean } = {}
): Promise<UserGistsData | null> {
  const gistCount = clampCount(options.gistCount ?? 100);

  if (!hasGitHubToken()) {
    let userinfo: User;

    try {
      userinfo = await getUser(user);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }

    const gists = await listGists(user, gistCount);
    return { userinfo, gists };
  }

  const data = await ghGraphql<UserGistsQueryData>(
    'UserGists',
    GISTS_QUERY,
    { login: user, gistCount },
    { ttl: 1800, fresh: options.fresh }
  );

  const node = data.user;
  if (!node) return null;

  const userinfo = mapUserNode(node);

  return {
    userinfo,
    gists: (node.gists?.nodes ?? []).map((gist) =>
      mapGistNode(gist, userinfo)
    ),
  };
}

interface OgStatsQueryData {
  user: {
    login: string;
    name: string | null;
    followers: { totalCount: number };
    publicRepos: { totalCount: number };
    publicGists: { totalCount: number };
    repositories: {
      nodes: {
        stargazerCount: number;
        primaryLanguage: { name: string } | null;
      }[] | null;
    };
  } | null;
}

const loadOgStatsRest = async (user: string): Promise<OgStats | null> => {
  const userinfo = await getUser(user);
  const repos = await listRepos(user, { perPage: 100 }).catch(() => []);

  return {
    login: userinfo.login,
    name: userinfo.name,
    publicRepos: userinfo.public_repos,
    publicGists: userinfo.public_gists,
    followers: userinfo.followers,
    stars: repos.reduce(
      (total, repo) => total + (repo.stargazers_count ?? 0),
      0
    ),
    languages: new Set(
      repos.map((repo) => repo.language).filter(Boolean)
    ).size,
  };
};

/**
 * OG 图只需要统计数字，不要 README / gist / 仓库详情。
 * 一次 GraphQL 取回，社交爬虫批量抓图时不再吃 3 次 REST。
 */
export async function loadOgStats(user: string): Promise<OgStats | null> {
  if (!hasGitHubToken()) return loadOgStatsRest(user);

  const data = await ghGraphql<OgStatsQueryData>(
    'OgStats',
    OG_STATS_QUERY,
    { login: user, repoCount: 100 },
    { ttl: 3600 }
  );

  const node = data.user;
  if (!node) return null;

  const repos = node.repositories.nodes ?? [];

  return {
    login: node.login,
    name: node.name,
    publicRepos: node.publicRepos.totalCount,
    publicGists: node.publicGists.totalCount,
    followers: node.followers.totalCount,
    stars: repos.reduce((total, repo) => total + repo.stargazerCount, 0),
    languages: new Set(
      repos
        .map((repo) => repo.primaryLanguage?.name)
        .filter((name): name is string => Boolean(name))
    ).size,
  };
}
