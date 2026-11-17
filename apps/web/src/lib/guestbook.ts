import type { Gist, GistComment, User } from '@classy/types/github';

import { isNotFound } from './errors.ts';
import {
  getGist,
  getUser,
  listGistComments,
} from './github.ts';
import { hasGitHubToken } from './github-auth.ts';
import { ghGraphql } from './graphql.ts';
import {
  mapGistCommentNode,
  type GraphQLGistCommentNode,
} from './graphql-mappers.ts';
import { GIST_COMMENTS_QUERY } from './graphql-queries.ts';
import { loadUserGists, loadUserInfo } from './profile.ts';

export interface GuestbookData {
  userinfo: User;
  gist: Gist | null;
  comments: GistComment[];
  /** 评论接口失败时保留 gist 本身，页面显示“评论暂时不可用” */
  commentsUnavailable: boolean;
}

interface GistCommentsQueryData {
  node: {
    isPublic: boolean;
    owner: { login: string } | null;
    comments: { nodes: GraphQLGistCommentNode[] | null };
  } | null;
}

/** GraphQL 评论读取：gist 用 Node ID（G_kw…），不是页面的 hex id。 */
export async function loadGistComments(nodeId: string): Promise<GistComment[]> {
  const data = await ghGraphql<GistCommentsQueryData>(
    'GistComments',
    GIST_COMMENTS_QUERY,
    { id: nodeId },
    { ttl: 300 }
  );

  return (data.node?.comments.nodes ?? []).map(mapGistCommentNode);
}

const validGist = (gist: Gist, userinfo: User): boolean =>
  Boolean(
    gist.public &&
      gist.owner?.login?.toLowerCase() === userinfo.login.toLowerCase()
  );

const loadGuestbookRest = async (
  user: string,
  gistId: string | null
): Promise<GuestbookData | null> => {
  let userinfo: User;

  try {
    userinfo = await getUser(user);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }

  let gist: Gist | null = null;
  let comments: GistComment[] = [];
  let commentsUnavailable = false;

  if (gistId) {
    gist = await getGist(gistId).catch(() => null);

    // 配置是公开的，必须确认这条 Gist 确实属于当前用户，
    // 否则任何人都能把别人的评论区嵌进自己的页面。
    if (gist && !validGist(gist, userinfo)) gist = null;

    if (gist) {
      try {
        comments = await listGistComments(gistId);
      } catch {
        commentsUnavailable = true;
      }
    }
  }

  return { userinfo, gist, comments, commentsUnavailable };
};

/**
 * 留言簿数据。
 *
 * 有 token 时用 UserGists 找配置里的 gist，再用 GraphQL node(id:) 读评论，
 * 完全不消耗 REST；gist 不在前 100 个时回退一次 REST getGist。
 */
export async function loadGuestbook(
  user: string,
  gistId: string | null
): Promise<GuestbookData | null> {
  if (!hasGitHubToken()) return loadGuestbookRest(user, gistId);

  let userinfo: User;
  let gists: Gist[] = [];

  if (gistId) {
    const data = await loadUserGists(user, { gistCount: 100 });
    if (!data) return null;
    userinfo = data.userinfo;
    gists = data.gists;
  } else {
    const data = await loadUserInfo(user);
    if (!data) return null;
    userinfo = data;
  }

  let gist = gistId ? gists.find((item) => item.id === gistId) ?? null : null;

  // 用户 gist 超过 100 个时，配置里的 gist 可能不在第一页；回退一次 REST。
  if (gistId && !gist) {
    gist = await getGist(gistId).catch(() => null);
  }

  if (gist && !validGist(gist, userinfo)) gist = null;

  let comments: GistComment[] = [];
  let commentsUnavailable = false;

  if (gist) {
    try {
      comments = gist.node_id
        ? await loadGistComments(gist.node_id)
        : await listGistComments(gistId as string);
    } catch {
      commentsUnavailable = true;
    }
  }

  return { userinfo, gist, comments, commentsUnavailable };
}
