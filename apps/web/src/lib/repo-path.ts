import type {
  RepoDirectory,
  RepoDirEntry,
  RepoFile,
  RepoPathData,
} from './github.ts';

import { hasGitHubToken } from './github-auth.ts';
import { getRepoPath } from './github.ts';
import { ghGraphql } from './graphql.ts';
import { REPO_PATH_QUERY } from './graphql-queries.ts';

interface RepoPathTreeEntry {
  name: string;
  type: 'blob' | 'tree' | 'commit' | string;
  mode: number | string;
  object: { byteSize?: number; isBinary?: boolean; isTruncated?: boolean } | null;
}

interface RepoPathTree {
  __typename: 'Tree';
  entries: RepoPathTreeEntry[] | null;
}

interface RepoPathBlob {
  __typename: 'Blob';
  byteSize: number;
  isBinary: boolean;
  isTruncated: boolean;
  text?: string | null;
}

type RepoPathObject = RepoPathTree | RepoPathBlob | { __typename: string };

interface RepoPathQueryData {
  repository: {
    object: RepoPathObject | null;
  } | null;
}

const encodePath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const githubUrl = (
  kind: 'blob' | 'tree',
  user: string,
  repo: string,
  path: string
): string => `https://github.com/${user}/${repo}/${kind}/HEAD/${encodePath(path)}`;

const rawUrl = (user: string, repo: string, path: string): string =>
  `https://raw.githubusercontent.com/${user}/${repo}/HEAD/${encodePath(path)}`;

const typeOf = (entry: RepoPathTreeEntry): RepoDirEntry['type'] => {
  const mode =
    typeof entry.mode === 'number' ? entry.mode : Number(entry.mode);

  if ((mode & 0o170000) === 0o160000) return 'submodule';
  if ((mode & 0o170000) === 0o120000) return 'symlink';
  if (entry.type === 'tree') return 'dir';

  return 'file';
};

const joinPath = (parent: string, name: string): string =>
  parent ? `${parent}/${name}` : name;

const mapDirectory = (
  user: string,
  repo: string,
  path: string,
  entries: RepoPathTreeEntry[]
): RepoDirectory => ({
  kind: 'dir',
  path,
  htmlUrl: githubUrl('tree', user, repo, path),
  entries: entries.map((entry) => {
    const type = typeOf(entry);
    const entryPath = joinPath(path, entry.name);

    return {
      name: entry.name,
      path: entryPath,
      type,
      size: type === 'dir' ? 0 : entry.object?.byteSize ?? 0,
      htmlUrl: githubUrl(
        type === 'dir' || type === 'submodule' ? 'tree' : 'blob',
        user,
        repo,
        entryPath
      ),
    };
  }),
});

const mapFile = (
  user: string,
  repo: string,
  path: string,
  blob: RepoPathBlob
): RepoFile => ({
  kind: 'file',
  name: path.split('/').pop() ?? path,
  path,
  size: blob.byteSize ?? 0,
  htmlUrl: githubUrl('blob', user, repo, path),
  downloadUrl: rawUrl(user, repo, path),
  // GraphQL text 固定截断在 512K 字符；二进制 / 超大文件 / 截断文本
  // 都不站内渲染，交给页面跳去 GitHub，避免展示半截内容。
  source:
    blob.isBinary || blob.isTruncated || blob.text == null
      ? undefined
      : blob.text,
});

/**
 * 仓库目录 / 文件页。
 *
 * 有 token 时用一次 GraphQL Tree/Blob 替代 contents API；二进制、超大文件
 * 或 GraphQL 失败时回退原来的 REST contents 路径。
 */
export async function loadRepoPath(
  user: string,
  repo: string,
  path: string
): Promise<RepoPathData | null> {
  if (!hasGitHubToken()) return getRepoPath(user, repo, path);

  try {
    const data = await ghGraphql<RepoPathQueryData>(
      'RepoPath',
      REPO_PATH_QUERY,
      { owner: user, name: repo, expression: `HEAD:${path}` },
      { ttl: 600 }
    );

    const object = data.repository?.object;
    if (!object) return null;

    if (object.__typename === 'Tree') {
      return mapDirectory(
        user,
        repo,
        path,
        (object as RepoPathTree).entries ?? []
      );
    }

    if (object.__typename === 'Blob') {
      return mapFile(user, repo, path, object as RepoPathBlob);
    }

    // 子模块路径：GraphQL 可能返回 Commit；页面会跳去 GitHub。
    if (object.__typename === 'Commit') {
      return {
        kind: 'file',
        name: path.split('/').pop() ?? path,
        path,
        size: 0,
        htmlUrl: githubUrl('tree', user, repo, path),
      };
    }

    return null;
  } catch (error) {
    console.warn(
      `[classy] repo path GraphQL failed for ${user}/${repo}/${path}, fallback REST:`,
      (error as Error).message
    );
    return getRepoPath(user, repo, path);
  }
}
