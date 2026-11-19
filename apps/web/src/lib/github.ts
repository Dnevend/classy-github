import type { Gist, GistComment, Repo, User } from '@classy/types/github';

import { USER_AGENT } from './constants.ts';
import { cacheGet, cacheGetStale, cachePut } from './edge-cache.ts';
import { getGitHubToken } from './github-auth.ts';
import { GitHubError } from './github-error.ts';
import { parseRateLimit } from './github-rate-limit.ts';
import {
  readRateLimitMarker,
  writeRateLimitMarker,
} from './github-rate-limit-marker.ts';

export { GitHubError } from './github-error.ts';
export type { RateLimitInfo } from './github-error.ts';

const API_ORIGIN = 'https://api.github.com';

const DEFAULT_TTL = 1800;
/** 明确 404 的负缓存：随机用户名扫描不应该每次都打 GitHub。 */
const NEGATIVE_TTL = 1800;
/** 限流 / 5xx 时最多拿多旧的缓存兜底。 */
const STALE_TTL = 60 * 60 * 24;

type Query = Record<string, string | number | undefined>;

const buildUrl = (path: string, query?: Query) => {
  const url = new URL(path, API_ORIGIN);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url;
};

const buildHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept: 'application/vnd.github+json',
  };

  // 有 token 走 5000 次/小时，没有就退回匿名 60 次/小时
  const token = await getGitHubToken();
  if (token) headers.authorization = `Bearer ${token}`;

  return headers;
};

const jsonResponse = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/** 负缓存用独立 key，避免污染正常数据的 JSON 类型。 */
const markerKey = (key: Request, kind: 'not-found' | 'rate-limit') => {
  const url = new URL(key.url);
  url.searchParams.set('__classy', kind);
  return new Request(url.toString(), { method: 'GET' });
};

const staleJson = async <T>(key: Request): Promise<T | undefined> => {
  const stale = await cacheGetStale(key, STALE_TTL);
  if (!stale) return undefined;

  return (await stale.json().catch(() => undefined)) as T | undefined;
};

/**
 * 带边缘缓存的 GitHub 读取。
 *
 * 缓存键只用 URL（不带 Authorization），否则 Cache API 会拒绝写入。
 * GitHub 限流 / 5xx / 网络错误时优先返回旧缓存，避免把整页变成 503。
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

  // 明确的 404：短时间直接复用，不再打 GitHub
  const notFoundKey = markerKey(key, 'not-found');
  const notFound = await cacheGet(notFoundKey, NEGATIVE_TTL);
  if (notFound) {
    throw new GitHubError(404, `GitHub 404 for ${path} (cached)`);
  }

  // 已经确认主限额耗尽：直接走旧缓存或快速失败，不再消耗请求
  const rateMarker = await readRateLimitMarker('core');
  if (rateMarker) {
    const stale = await staleJson<T>(key);
    if (stale !== undefined) return stale;

    throw new GitHubError(
      403,
      `GitHub rate limit active until ${new Date(rateMarker.until * 1000).toISOString()} for ${path}`,
      {
        rateLimit: {
          resetAt: rateMarker.resetAt,
          retryAfter: rateMarker.retryAfter,
        },
      }
    );
  }

  let res: Response;

  try {
    res = await fetch(url, { headers: await buildHeaders() });
  } catch (error) {
    const stale = await staleJson<T>(key);
    if (stale !== undefined) {
      console.warn(`[classy] GitHub network error, serving stale ${path}`);
      return stale;
    }

    throw new GitHubError(
      502,
      `GitHub network error for ${path}: ${(error as Error).message}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const rateLimit = parseRateLimit(res, body);

    if (rateLimit) {
      console.warn('[classy] github rate-limit', {
        resource: 'rest',
        path,
        status: res.status,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
        retryAfter: rateLimit.retryAfter,
      });
      await writeRateLimitMarker('core', rateLimit, res.status);

      const stale = await staleJson<T>(key);
      if (stale !== undefined) {
        console.warn(`[classy] GitHub rate limited, serving stale ${path}`);
        return stale;
      }

      throw new GitHubError(
        res.status,
        `GitHub ${res.status} ${res.statusText} for ${path} — ${body.slice(0, 160)}`,
        { rateLimit }
      );
    }

    if (res.status === 404) {
      await cachePut(notFoundKey, jsonResponse({ __classy: 'not-found' }), NEGATIVE_TTL);
      throw new GitHubError(
        404,
        `GitHub 404 ${res.statusText} for ${path} — ${body.slice(0, 160)}`
      );
    }

    // token 失效/权限错误也可能只是暂时的；旧数据比错误页好
    if (res.status === 401 || res.status >= 500) {
      const stale = await staleJson<T>(key);
      if (stale !== undefined) {
        console.warn(`[classy] GitHub ${res.status}, serving stale ${path}`);
        return stale;
      }
    }

    throw new GitHubError(
      res.status,
      `GitHub ${res.status} ${res.statusText} for ${path} — ${body.slice(0, 160)}`
    );
  }

  const response = new Response(res.body, res);

  // 失败不影响渲染：缓存只是优化。
  // 副本活到 stale 窗口，限流/5xx 时才有旧数据可用。
  await cachePut(key, response, ttl, STALE_TTL);

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
    ttl: 1800,
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
      { ttl: 1800 }
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
      { ttl: 1800 }
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
 * 用户 fork 的默认分支（setup 页生成 edit URL 用）。
 * 配置读取已不再依赖它：GraphQL 用 `HEAD:`，无 token 时走 raw 兜底。
 * 仓库不存在 / API 失败时返回 null，由调用方走兜底顺序。
 */
export const getDefaultBranch = async (user: string): Promise<string | null> => {
  try {
    const repo = await ghFetch<{ default_branch?: string }>(
      `/repos/${encodeURIComponent(user)}/classy-github`,
      { ttl: 1800 }
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
  ghFetch<Gist>(`/gists/${encodeURIComponent(gistId)}`, { ttl: 1800 });

/**
 * Gist 评论：留言簿的数据源。
 * 评论由 GitHub 托管，站主在 Gist 里删除即可，不需要自己的审核后台。
 */
export const listGistComments = (gistId: string, perPage = 100) =>
  ghFetch<GistComment[]>(
    `/gists/${encodeURIComponent(gistId)}/comments`,
    { query: { per_page: perPage }, ttl: 300 }
  );
