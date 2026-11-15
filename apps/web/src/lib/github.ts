import { GITHUB_TOKEN } from 'astro:env/server';
import type { Follower, Gist, Repo, RepoContent, User } from '@classy/types/github';

const API_ORIGIN = 'https://api.github.com';

/** GitHub 要求提供能标识调用方的 User-Agent */
const USER_AGENT = 'classy-github/2.0 (+https://github.com/Dnevend/classy-github)';

const DEFAULT_TTL = 300;

export class GitHubError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

type Query = Record<string, string | number | undefined>;

const buildUrl = (path: string, query?: Query) => {
  const url = new URL(path, API_ORIGIN);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url;
};

/**
 * Workers 的 Cache API。`astro dev` / 单元测试环境里可能不存在，因此按可选处理。
 */
const edgeCache = (): Cache | undefined => {
  const runtime = globalThis as unknown as { caches?: { default?: Cache } };
  return runtime.caches?.default;
};

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept: 'application/vnd.github+json',
  };

  // 有 token 走 5000 次/小时，没有就退回匿名 60 次/小时
  if (GITHUB_TOKEN) headers.authorization = `Bearer ${GITHUB_TOKEN}`;

  return headers;
};

/**
 * 带边缘缓存的 GitHub 读取。
 *
 * 缓存键只用 URL（不带 Authorization），否则 Cache API 会拒绝写入。
 */
export async function ghFetch<T>(
  path: string,
  options: { query?: Query; ttl?: number } = {}
): Promise<T> {
  const { query, ttl = DEFAULT_TTL } = options;
  const url = buildUrl(path, query);
  const key = new Request(url.toString(), { method: 'GET' });
  const cache = edgeCache();

  const cached = await cache?.match(key);
  if (cached) return (await cached.json()) as T;

  const res = await fetch(url, { headers: buildHeaders() });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GitHubError(
      res.status,
      `GitHub ${res.status} ${res.statusText} for ${path} — ${body.slice(0, 160)}`
    );
  }

  const response = new Response(res.body, res);
  response.headers.set('cache-control', `public, max-age=${ttl}`);

  if (cache) {
    // 失败不影响渲染：缓存只是优化
    await cache.put(key, response.clone()).catch(() => undefined);
  }

  return (await response.json()) as T;
}

export const getUser = (user: string) =>
  ghFetch<User>(`/users/${encodeURIComponent(user)}`);

export const listRepos = (user: string, perPage = 100) =>
  ghFetch<Repo[]>(`/users/${encodeURIComponent(user)}/repos`, {
    query: { sort: 'updated', per_page: perPage },
  });

export const listGists = (user: string, perPage = 100) =>
  ghFetch<Gist[]>(`/users/${encodeURIComponent(user)}/gists`, {
    query: { per_page: perPage },
    ttl: 600,
  });

export const listFollowers = (user: string) =>
  ghFetch<Follower[]>(`/users/${encodeURIComponent(user)}/followers`, {
    query: { per_page: 100 },
    ttl: 600,
  });

export const listFollowing = (user: string) =>
  ghFetch<Follower[]>(`/users/${encodeURIComponent(user)}/following`, {
    query: { per_page: 100 },
    ttl: 600,
  });

export interface ReadmeSource {
  /** 已展开的 markdown 原文 */
  source: string;
  /** 图片/链接相对路径的基准地址（raw.githubusercontent.com 上的目录） */
  base: string;
}

const downloadReadme = async (
  contents: RepoContent[]
): Promise<ReadmeSource | null> => {
  const readme = contents.find((entry) => /^readme\.md$/i.test(entry.name));
  if (!readme?.download_url) return null;

  const res = await fetch(readme.download_url, {
    headers: { 'user-agent': USER_AGENT },
  });

  if (!res.ok) return null;

  return {
    source: await res.text(),
    base: readme.download_url.slice(0, readme.download_url.lastIndexOf('/') + 1),
  };
};

/** 读取仓库根目录的 README，仓库不存在 / 没有 README 时返回 null */
export async function getRepoReadme(
  user: string,
  repo: string
): Promise<ReadmeSource | null> {
  let contents: RepoContent[];

  try {
    contents = await ghFetch<RepoContent[]>(
      `/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/contents`,
      { ttl: 600 }
    );
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }

  return downloadReadme(contents);
}

/**
 * 读取用户的 profile README：`<user>/<user>` 仓库根目录下的 README。
 */
export async function getUserReadme(user: string): Promise<ReadmeSource | null> {
  return getRepoReadme(user, user);
}

export const getRepo = (user: string, repo: string) =>
  ghFetch<Repo>(
    `/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}`
  );

export const getGist = (gistId: string) =>
  ghFetch<Gist>(`/gists/${encodeURIComponent(gistId)}`, { ttl: 600 });
