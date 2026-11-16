import { GITHUB_TOKEN } from 'astro:env/server';
import type { Follower, Gist, GistComment, Repo, User } from '@classy/types/github';

import { USER_AGENT } from './constants.ts';
import { cacheGet, cachePut } from './edge-cache.ts';

const API_ORIGIN = 'https://api.github.com';

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

  const cached = await cacheGet(key, ttl);
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

  // 失败不影响渲染：缓存只是优化
  await cachePut(key, response, ttl);

  return (await response.json()) as T;
}

export const getUser = (user: string) =>
  ghFetch<User>(`/users/${encodeURIComponent(user)}`);

export const listRepos = (
  user: string,
  options: { page?: number; perPage?: number } = {}
) => {
  const { page = 1, perPage = 30 } = options;

  return ghFetch<Repo[]>(`/users/${encodeURIComponent(user)}/repos`, {
    query: { sort: 'updated', per_page: perPage, page },
  });
};

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
  /** README 在仓库内的路径，用于解析相对链接 */
  path: string;
}

/** README 接口返回的元数据（content 是 base64） */
interface ReadmePayload {
  name?: string;
  path?: string;
  content?: string;
  encoding?: string;
  download_url?: string;
}

const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * 读取仓库根目录的 README。
 *
 * 走 `/repos/{owner}/{repo}/readme`（带 token、走 5000/h 配额）而不是
 * `download_url` 指向的 raw.githubusercontent.com —— 后者会对 Cloudflare
 * 出口 IP 返回 503（实测 antfu/antfu 在小文件上就复现），而且完全不受我们的
 * 配额与缓存控制。
 */
export async function getRepoReadme(
  user: string,
  repo: string
): Promise<ReadmeSource | null> {
  let payload: ReadmePayload;

  try {
    payload = await ghFetch<ReadmePayload>(
      `/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/readme`,
      { ttl: 600 }
    );
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      console.warn(`[classy] ${user}/${repo}: 没有 README`);
      return null;
    }
    throw error;
  }

  // 相对图片要按文件所在目录展开；download_url 里带着分支名
  const base = payload.download_url
    ? payload.download_url.slice(0, payload.download_url.lastIndexOf('/') + 1)
    : `https://raw.githubusercontent.com/${user}/${repo}/HEAD/`;

  if (payload.content) {
    return {
      source: decodeBase64(payload.content),
      base,
      path: payload.path ?? 'README.md',
    };
  }

  // 文件超过 1MB 时 GitHub 不返回 content，只能退回 CDN
  if (!payload.download_url) return null;

  const res = await fetch(payload.download_url, {
    headers: { 'user-agent': USER_AGENT },
  });

  if (!res.ok) {
    console.warn(
      `[classy] ${user}/${repo}: README 过大且 CDN 拉取失败 ${res.status}`
    );
    return null;
  }

  return { source: await res.text(), base, path: payload.path ?? 'README.md' };
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

/** contents API 的条目（文件夹返回数组，文件返回对象） */
interface ContentsPayload {
  type?: string;
  name?: string;
  path?: string;
  size?: number;
  content?: string;
  encoding?: string;
  download_url?: string | null;
  html_url?: string | null;
}

export type RepoEntryType = 'file' | 'dir' | 'symlink' | 'submodule';

export interface RepoDirEntry {
  name: string;
  path: string;
  type: RepoEntryType;
  size: number;
  htmlUrl: string;
}

export interface RepoDirectory {
  kind: 'dir';
  path: string;
  htmlUrl: string;
  entries: RepoDirEntry[];
}

export interface RepoFile {
  kind: 'file';
  name: string;
  path: string;
  size: number;
  htmlUrl: string;
  downloadUrl?: string;
  /** 解码后的文本；二进制、过大或拉取失败时为 undefined */
  source?: string;
}

export type RepoPathData = RepoDirectory | RepoFile;

const encodeRepoPath = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const normalizeEntryType = (type?: string): RepoEntryType =>
  type === 'dir' || type === 'symlink' || type === 'submodule' ? type : 'file';

const githubPathUrl = (kind: 'blob' | 'tree', user: string, repo: string, path: string) =>
  `https://github.com/${user}/${repo}/${kind}/HEAD/${encodeRepoPath(path)}`;

/**
 * 读取仓库内任意路径。
 *
 * 目录返回条目数组，文件返回解码后的文本。超过 1MB 的内容 GitHub 不在
 * JSON 里返回，这里也不退回 CDN——直接让文件页跳去 GitHub，避免为了
 * 一个没人看的二进制文件把 Worker 内存打满。
 */
export async function getRepoPath(
  user: string,
  repo: string,
  path: string
): Promise<RepoPathData | null> {
  let payload: ContentsPayload | ContentsPayload[];

  try {
    payload = await ghFetch<ContentsPayload | ContentsPayload[]>(
      `/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(path)}`,
      { ttl: 600 }
    );
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }

  if (Array.isArray(payload)) {
    return {
      kind: 'dir',
      path,
      htmlUrl: githubPathUrl('tree', user, repo, path),
      entries: payload.map((entry) => {
        const type = normalizeEntryType(entry.type);
        const entryPath = entry.path ?? entry.name ?? '';

        return {
          name: entry.name ?? entryPath.split('/').pop() ?? entryPath,
          path: entryPath,
          type,
          size: entry.size ?? 0,
          htmlUrl:
            entry.html_url ??
            githubPathUrl(type === 'dir' ? 'tree' : 'blob', user, repo, entryPath),
        };
      }),
    };
  }

  const filePath = payload.path ?? path;
  const size = payload.size ?? 0;

  let source: string | undefined;
  if (payload.encoding === 'base64' && typeof payload.content === 'string') {
    source = decodeBase64(payload.content);
  } else if (size === 0) {
    source = '';
  }

  return {
    kind: 'file',
    name: payload.name ?? filePath.split('/').pop() ?? filePath,
    path: filePath,
    size,
    htmlUrl: payload.html_url ?? githubPathUrl('blob', user, repo, filePath),
    downloadUrl: payload.download_url ?? undefined,
    source,
  };
}

/**
 * 用户 fork 的默认分支。配置要从默认分支读，而不是死磕 main。
 * 仓库不存在 / API 失败时返回 null，由调用方走兜底顺序。
 */
export const getDefaultBranch = async (user: string): Promise<string | null> => {
  try {
    const repo = await ghFetch<{ default_branch?: string }>(
      `/repos/${encodeURIComponent(user)}/classy-github`,
      { ttl: 600 }
    );
    return repo.default_branch ?? null;
  } catch (error) {
    // 404 = 没有 fork，可以放心走 main / master 兜底；
    // 限流 / 网络错误要冒泡，调用方不能据此判断「未认领」。
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
};

export const getGist = (gistId: string) =>
  ghFetch<Gist>(`/gists/${encodeURIComponent(gistId)}`, { ttl: 600 });

/**
 * Gist 评论：留言簿的数据源。
 * 评论由 GitHub 托管，站主在 Gist 里删除即可，不需要自己的审核后台。
 */
export const listGistComments = (gistId: string, perPage = 100) =>
  ghFetch<GistComment[]>(
    `/gists/${encodeURIComponent(gistId)}/comments`,
    { query: { per_page: perPage }, ttl: 300 }
  );
