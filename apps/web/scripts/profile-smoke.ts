/**
 * GraphQL 节点 → REST 形状的映射断言。
 * 运行：node --experimental-strip-types scripts/profile-smoke.ts
 */
import assert from 'node:assert/strict';

import {
  mapGistCommentNode,
  mapGistNode,
  mapPinnedRepoNode,
  mapPinnedRepos,
  mapRepoNode,
  mapUserNode,
  type GraphQLUserNode,
} from '../src/lib/graphql-mappers.ts';
import {
  mergeProfileRepos,
  PINNED_LIMIT,
  repoHref,
} from '../src/lib/profile-repos.ts';

const userNode: GraphQLUserNode = {
  login: 'octocat',
  name: 'The Octocat',
  avatarUrl: 'https://avatars.example/u/1',
  bio: 'bio',
  company: 'GitHub',
  location: 'San Francisco',
  websiteUrl: 'https://example.com',
  twitterUsername: 'octocat',
  createdAt: '2011-01-25T18:44:36Z',
  followers: { totalCount: 12 },
  following: { totalCount: 3 },
  repositories: { totalCount: 8, nodes: [] },
  gists: { totalCount: 2, nodes: [] },
  profileRepo: { object: { text: '# hi' } },
};

const user = mapUserNode(userNode);

assert.equal(user.login, 'octocat');
assert.equal(user.avatar_url, userNode.avatarUrl);
assert.equal(user.blog, 'https://example.com');
assert.equal(user.twitter_username, 'octocat');
assert.equal(user.public_repos, 8);
assert.equal(user.public_gists, 2);
assert.equal(user.followers, 12);
assert.equal(user.created_at, '2011-01-25T18:44:36Z');

const repo = mapRepoNode(
  {
    name: 'hello-world',
    description: 'demo',
    isPrivate: false,
    stargazerCount: 42,
    forkCount: 7,
    isFork: false,
    isTemplate: false,
    homepageUrl: 'https://example.com/hello',
    updatedAt: '2026-01-02T03:04:05Z',
    url: 'https://github.com/octocat/hello-world',
    primaryLanguage: { name: 'TypeScript' },
  },
  user
);

assert.equal(repo.stargazers_count, 42);
assert.equal(repo.forks_count, 7);
assert.equal(repo.private, false);
assert.equal(repo.language, 'TypeScript');
assert.equal(repo.html_url, 'https://github.com/octocat/hello-world');
assert.equal(repo.full_name, 'octocat/hello-world');
assert.equal(repo.homepage, 'https://example.com/hello');
assert.equal(repo.updated_at, '2026-01-02T03:04:05Z');

const pinnedNode = {
  name: 'hello-world',
  description: 'demo',
  isPrivate: false,
  stargazerCount: 42,
  forkCount: 7,
  isFork: false,
  isTemplate: false,
  homepageUrl: null,
  updatedAt: '2026-01-02T03:04:05Z',
  url: 'https://github.com/octocat/hello-world',
  primaryLanguage: null,
  owner: { login: 'octocat' },
};

const pinnedRepo = mapPinnedRepoNode(pinnedNode, user);

assert.equal(pinnedRepo.full_name, 'octocat/hello-world');
assert.equal(pinnedRepo.owner.login, 'octocat');

const orgPinnedNode = {
  name: 'design-system',
  description: null,
  isPrivate: false,
  stargazerCount: 0,
  forkCount: 0,
  isFork: false,
  isTemplate: false,
  homepageUrl: null,
  updatedAt: '2026-01-01T00:00:00Z',
  url: 'https://github.com/acme/design-system',
  primaryLanguage: null,
  owner: { login: 'acme' },
};

const orgPinnedRepo = mapPinnedRepoNode(orgPinnedNode, user);

assert.equal(orgPinnedRepo.full_name, 'acme/design-system');
assert.equal(orgPinnedRepo.owner.login, 'acme');

const privatePinnedNode = {
  ...pinnedNode,
  name: 'secret',
  isPrivate: true,
  url: 'https://github.com/octocat/secret',
};

// 主页只展示公开 pin：私有节点在数据层就被过滤
assert.deepEqual(
  mapPinnedRepos([pinnedNode, orgPinnedNode, privatePinnedNode], user).map(
    (item) => item.full_name
  ),
  ['octocat/hello-world', 'acme/design-system']
);

// 本人仓库走站内详情页，组织 / 他人仓库直接去 GitHub
assert.equal(repoHref(pinnedRepo, 'octocat', 'octocat'), '/octocat/repo/hello-world');
assert.equal(repoHref(pinnedRepo, 'Octocat', 'OCTOCAT'), '/Octocat/repo/hello-world');
assert.equal(
  repoHref(orgPinnedRepo, 'octocat', 'octocat'),
  'https://github.com/acme/design-system'
);

const makeRepo = (name: string, options: { isPrivate?: boolean } = {}) =>
  mapPinnedRepoNode(
    {
      name,
      description: null,
      isPrivate: options.isPrivate ?? false,
      stargazerCount: 0,
      forkCount: 0,
      isFork: false,
      isTemplate: false,
      homepageUrl: null,
      updatedAt: '2026-01-01T00:00:00Z',
      url: `https://github.com/octocat/${name}`,
      primaryLanguage: null,
      owner: { login: 'octocat' },
    },
    user
  );

assert.equal(PINNED_LIMIT, 6);

assert.deepEqual(
  mergeProfileRepos(
    [makeRepo('pinned-a'), makeRepo('pinned-b')],
    [makeRepo('recent-a')],
    4
  ).map((item) => item.name),
  ['pinned-a', 'pinned-b', 'recent-a']
);

// 同一个仓库同时出现在 pinned 和最近更新里：只保留 pinned 的顺序
assert.deepEqual(
  mergeProfileRepos(
    [makeRepo('Hello')],
    [makeRepo('hello'), makeRepo('other')],
    3
  ).map((item) => item.name),
  ['Hello', 'other']
);

// 私有 pin 不展示
assert.deepEqual(
  mergeProfileRepos(
    [makeRepo('secret', { isPrivate: true })],
    [makeRepo('public')],
    3
  ).map((item) => item.name),
  ['public']
);

// limit 截断与 0
assert.deepEqual(
  mergeProfileRepos([makeRepo('pinned')], [makeRepo('recent')], 1).map(
    (item) => item.name
  ),
  ['pinned']
);
assert.deepEqual(mergeProfileRepos([makeRepo('pinned')], [], 0), []);

const gist = mapGistNode(
  {
    id: 'gist-1',
    description: 'note',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isPublic: true,
    url: 'https://gist.github.com/octocat/e2e89074d0439b74222911fc6449fbb1',
    files: [
      {
        name: 'note.md',
        size: 5,
        text: '# hi',
        isTruncated: false,
        language: { name: 'Markdown' },
      },
    ],
    comments: { totalCount: 4 },
  },
  user
);

assert.equal(gist.created_at, '2026-01-01T00:00:00Z');
assert.equal(gist.id, 'e2e89074d0439b74222911fc6449fbb1');
assert.equal(gist.node_id, 'gist-1');
assert.equal(gist.html_url, 'https://gist.github.com/octocat/e2e89074d0439b74222911fc6449fbb1');
assert.equal(gist.comments, 4);
assert.deepEqual(Object.keys(gist.files), ['note.md']);
assert.equal(gist.files['note.md']?.content, '# hi');
assert.equal(gist.files['note.md']?.language, 'Markdown');

const comment = mapGistCommentNode({
  id: 'GC_abc',
  databaseId: 42,
  body: 'hello',
  createdAt: '2026-01-01T00:00:00Z',
  author: {
    login: 'octocat',
    avatarUrl: 'https://avatars.example/u/1',
    url: 'https://github.com/octocat',
  },
});

assert.equal(comment.id, 42);
assert.equal(comment.node_id, 'GC_abc');
assert.equal(comment.body, 'hello');
assert.equal(comment.created_at, '2026-01-01T00:00:00Z');
assert.equal(comment.user.login, 'octocat');
assert.equal(comment.user.avatar_url, 'https://avatars.example/u/1');
assert.equal(comment.user.html_url, 'https://github.com/octocat');

console.log('graphql mappers ok');
