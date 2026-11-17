import type { Gist, Repo, User } from '@classy/types/github';

/**
 * GraphQL 节点 → 现有 REST 形状。
 *
 * 主题组件只认识 REST 字段（`stargazers_count`、`created_at` 等），
 * 迁移到 GraphQL 时在这里一次性转换，避免改十几套主题。
 */

export interface GraphQLRepositoryNode {
  name: string;
  description: string | null;
  isPrivate?: boolean;
  stargazerCount: number;
  forkCount: number;
  isFork: boolean;
  isTemplate: boolean;
  homepageUrl: string | null;
  updatedAt: string;
  url: string;
  primaryLanguage: { name: string } | null;
}

export interface GraphQLGistFile {
  name: string;
  size: number;
  text?: string | null;
  isTruncated?: boolean;
  language: { name: string } | null;
}

export interface GraphQLGistNode {
  id: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  url: string;
  files: GraphQLGistFile[];
  comments: { totalCount: number };
}

export interface GraphQLUserNode {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  twitterUsername: string | null;
  createdAt: string;
  followers: { totalCount: number };
  following: { totalCount: number };
  repositories: {
    totalCount: number;
    nodes?: GraphQLRepositoryNode[] | null;
  };
  gists?: {
    totalCount: number;
    nodes: GraphQLGistNode[] | null;
  } | null;
  profileRepo?: {
    object: { text?: string | null } | null;
  } | null;
}

export const mapUserNode = (node: GraphQLUserNode): User => ({
  login: node.login,
  id: 0,
  node_id: '',
  avatar_url: node.avatarUrl,
  gravatar_id: '',
  url: `https://api.github.com/users/${node.login}`,
  html_url: `https://github.com/${node.login}`,
  followers_url: '',
  following_url: '',
  gists_url: '',
  starred_url: '',
  subscriptions_url: '',
  organizations_url: '',
  repos_url: '',
  events_url: '',
  received_events_url: '',
  type: 'User',
  site_admin: false,
  name: node.name ?? '',
  company: node.company ?? '',
  blog: node.websiteUrl ?? '',
  location: node.location ?? '',
  email: null,
  hireable: false,
  bio: node.bio ?? '',
  twitter_username: node.twitterUsername ?? '',
  public_repos: node.repositories.totalCount,
  public_gists: node.gists?.totalCount ?? 0,
  followers: node.followers.totalCount,
  following: node.following.totalCount,
  created_at: node.createdAt,
  updated_at: node.createdAt,
});

export const mapRepoNode = (
  node: GraphQLRepositoryNode,
  owner: User
): Repo => ({
  id: 0,
  node_id: '',
  name: node.name,
  full_name: `${owner.login}/${node.name}`,
  private: node.isPrivate ?? false,
  html_url: node.url,
  description: node.description,
  fork: node.isFork,
  url: node.url,
  forks_url: `${node.url}/forks`,
  forks_count: node.forkCount,
  stargazers_count: node.stargazerCount,
  watchers_count: node.stargazerCount,
  language: node.primaryLanguage?.name ?? '',
  is_template: node.isTemplate,
  homepage: node.homepageUrl ?? '',
  created_at: node.updatedAt,
  updated_at: node.updatedAt,
  pushed_at: node.updatedAt,
  ssh_url: `git@github.com:${owner.login}/${node.name}.git`,
  clone_url: `https://github.com/${owner.login}/${node.name}.git`,
  owner,
});

/** GraphQL 的 Gist.id 是 Node ID（G_kw…），REST/页面链接用的是 hex id。 */
const gistIdFromUrl = (url: string): string => {
  const last = url.split('/').filter(Boolean).pop();
  return last && /^[0-9a-f]+$/i.test(last) ? last : url;
};

export const mapGistNode = (
  node: GraphQLGistNode,
  owner: User
): Gist => ({
  id: gistIdFromUrl(node.url),
  node_id: node.id,
  url: node.url,
  html_url: node.url,
  forks_url: '',
  files: Object.fromEntries(
    node.files.map((file) => [
      file.name,
      {
        content: file.text ?? '',
        filename: file.name,
        language: file.language?.name ?? '',
        raw_url: '',
        size: file.size,
        truncated: file.isTruncated ?? false,
        type: '',
      },
    ])
  ),
  public: node.isPublic,
  created_at: node.createdAt,
  updated_at: node.updatedAt,
  description: node.description ?? '',
  comments: node.comments.totalCount,
  owner,
});
