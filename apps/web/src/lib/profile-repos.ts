import type { Repo } from '@classy/types/github';

/** GitHub 个人主页最多允许 pin 6 个仓库。 */
export const PINNED_LIMIT = 6;

const repoKey = (repo: Repo) => repo.full_name.toLowerCase();

/**
 * 主页仓库区的展示顺序：pinned 优先，剩余名额用最近更新补齐。
 *
 * - 只展示公开仓库：带 token 时 `pinnedItems` 可能返回 token 有权看到的私有 pin；
 * - 按 `full_name` 去重：pinned 仓库通常也会出现在最近更新列表里；
 * - 非本人仓库（组织 / 合作仓库）保留在列表里，由页面决定链接到 GitHub。
 */
export const mergeProfileRepos = (
  pinned: readonly Repo[],
  recent: readonly Repo[],
  limit: number
): Repo[] => {
  const max = Math.floor(limit);
  if (!(max > 0)) return [];

  const merged: Repo[] = [];
  const seen = new Set<string>();

  for (const repo of [...pinned, ...recent]) {
    if (merged.length >= max) break;
    if (repo.private) continue;

    const key = repoKey(repo);
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(repo);
  }

  return merged;
};

/**
 * 卡片链接：本站只为当前用户渲染仓库详情页。
 * pin 到组织 / 他人仓库时直接去 GitHub，避免本地 `/repo/<name>` 404。
 */
export const repoHref = (
  repo: Repo,
  routeUser: string,
  profileLogin: string
): string =>
  repo.owner.login.toLowerCase() === profileLogin.toLowerCase()
    ? `/${routeUser}/repo/${repo.name}`
    : repo.html_url;
