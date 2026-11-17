import type { Gist } from '@classy/types/github';

import { hasGitHubToken } from './github-auth.ts';
import { getGist } from './github.ts';
import { ghGraphql } from './graphql.ts';
import {
  mapGistNode,
  minimalUser,
  type GraphQLGistNode,
} from './graphql-mappers.ts';
import { GIST_DETAIL_QUERY } from './graphql-queries.ts';
import { loadUserGists } from './profile.ts';

interface GistDetailNode extends GraphQLGistNode {
  owner: { login: string };
}

interface GistDetailQueryData {
  node: GistDetailNode | null;
}

/**
 * Gist 详情页。
 *
 * 页面 URL 用的是 REST hex id，而 GraphQL node(id:) 只认 Node ID。
 * 先用 UserGists 找到 hex → Node ID，再用一条 GistDetail 取文件内容；
 * gist 不在前 100 个 / GraphQL 失败 / 无 token 时回退 REST getGist。
 */
export async function loadGistDetail(
  user: string,
  gistId: string
): Promise<Gist> {
  if (!hasGitHubToken()) return getGist(gistId);

  try {
    const list = await loadUserGists(user, { gistCount: 100 });
    const gist = list?.gists.find((item) => item.id === gistId);

    if (gist?.node_id) {
      const data = await ghGraphql<GistDetailQueryData>(
        'GistDetail',
        GIST_DETAIL_QUERY,
        { id: gist.node_id },
        { ttl: 1800 }
      );

      if (data.node) {
        // Github GraphQL files limit 可能被夹在 100；如果拿到正好 100 或
        // 300（REST 上限），无法确认是否还有更多，回退 REST 拿完整列表。
        const fileCount = data.node.files.length;
        if (fileCount !== 100 && fileCount < 300) {
          return mapGistNode(data.node, minimalUser(data.node.owner.login));
        }
      }
    }
  } catch (error) {
    console.warn(
      `[classy] gist GraphQL failed for ${user}/${gistId}, fallback REST:`,
      (error as Error).message
    );
  }

  return getGist(gistId);
}
