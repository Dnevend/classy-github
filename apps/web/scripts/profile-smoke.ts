/**
 * GraphQL 节点 → REST 形状的映射断言。
 * 运行：node --experimental-strip-types scripts/profile-smoke.ts
 */
import assert from 'node:assert/strict';

import {
  mapGistNode,
  mapRepoNode,
  mapUserNode,
  type GraphQLUserNode,
} from '../src/lib/graphql-mappers.ts';

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

console.log('graphql mappers ok');
