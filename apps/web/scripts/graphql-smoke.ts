/**
 * 真实 GitHub GraphQL 查询的冒烟测试（会消耗 GraphQL 配额，不进默认 test）。
 * 运行：node --experimental-strip-types scripts/graphql-smoke.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CONFIG_QUERY,
  GIST_COMMENTS_QUERY,
  GIST_DETAIL_QUERY,
  GISTS_QUERY,
  OG_STATS_QUERY,
  PROFILE_QUERY,
  REPO_DETAIL_QUERY,
  REPO_PATH_QUERY,
  REPOS_QUERY,
  USER_INFO_QUERY,
} from '../src/lib/graphql-queries.ts';

const readToken = (): string | undefined => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  try {
    const text = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8');
    return text.match(/^GITHUB_TOKEN=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
};

const token = readToken();

if (!token) {
  console.log('graphql smoke skipped (no GITHUB_TOKEN)');
  process.exit(0);
}

interface GraphQLPayload {
  data?: Record<string, unknown> | null;
  errors?: { type?: string; message: string }[];
}

const query = async (
  operation: string,
  text: string,
  variables: Record<string, unknown>
): Promise<GraphQLPayload> => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'classy-github-smoke',
    },
    body: JSON.stringify({ query: text, variables }),
  });

  assert.equal(res.ok, true, `${operation}: HTTP ${res.status}`);
  return (await res.json()) as GraphQLPayload;
};

const profile = await query('Profile', PROFILE_QUERY, {
  login: 'Dnevend',
  repoCount: 6,
  gistCount: 3,
});
const profileUser = (profile.data as any)?.user;
assert.ok(profileUser, 'Profile 应该返回 user');
assert.equal(profileUser.login, 'Dnevend');
assert.ok(profileUser.repositories.nodes.length > 0, '应该有仓库');
assert.ok(
  profileUser.repositories.nodes.every((repo: any) => repo.isPrivate === false),
  'profile 只应该返回公开仓库'
);
assert.ok(profileUser.profileRepo.object.text.length > 0, '应该有 profile README');

const missing = await query('Profile', PROFILE_QUERY, {
  login: 'zzz-not-exist-9x8f',
  repoCount: 1,
  gistCount: 1,
});
assert.equal((missing.data as any)?.user, null, '不存在的用户应该返回 null');

const config = await query('Config', CONFIG_QUERY, { login: 'torvalds' });
assert.equal(
  (config.data as any)?.user?.repository,
  null,
  '没有 fork 的用户 config 应该是 null'
);
assert.ok(
  config.errors?.some((error) => error.type === 'NOT_FOUND'),
  'classy-github 仓库不存在时应该是 NOT_FOUND'
);

const og = await query('OgStats', OG_STATS_QUERY, {
  login: 'Dnevend',
  repoCount: 100,
});
const ogUser = (og.data as any)?.user;
assert.ok(ogUser, 'OgStats 应该返回 user');
assert.ok(ogUser.publicRepos.totalCount > 0);
assert.ok(ogUser.repositories.nodes.every((repo: any) => typeof repo.stargazerCount === 'number'));

const gists = await query('UserGists', GISTS_QUERY, {
  login: 'Dnevend',
  gistCount: 100,
});
const gistsUser = (gists.data as any)?.user;
assert.ok(gistsUser, 'UserGists 应该返回 user');
assert.ok(gistsUser.gists.nodes.length > 0, '应该有 gist');
assert.ok(
  /^[0-9a-f]+$/i.test(
    gistsUser.gists.nodes[0].url.split('/').filter(Boolean).pop()
  ),
  'gist.url 最后一段应该是 REST 的 hex id'
);

const repos = await query('ReposPage', REPOS_QUERY, {
  login: 'Dnevend',
  first: 30,
});
const reposUser = (repos.data as any)?.user;
assert.ok(reposUser, 'ReposPage 应该返回 user');
assert.ok(reposUser.repositories.nodes.length > 0, '应该有仓库');
assert.ok(
  reposUser.repositories.nodes.every((repo: any) => repo.isPrivate === false),
  'repos 第一页只应该返回公开仓库'
);

const userInfo = await query('UserInfo', USER_INFO_QUERY, { login: 'Dnevend' });
assert.equal((userInfo.data as any)?.user?.login, 'Dnevend');

const repoDetail = await query('RepoDetail', REPO_DETAIL_QUERY, {
  owner: 'Dnevend',
  name: 'classy-github',
});
const repoNode = (repoDetail.data as any)?.repository;
assert.equal(repoNode?.name, 'classy-github');
assert.ok(repoNode?.readme?.text?.length > 0, '应该有 README');

const gistId = gistsUser.gists.nodes[0]?.id;
assert.ok(gistId, '应该有 gist Node ID');
const gistComments = await query('GistComments', GIST_COMMENTS_QUERY, {
  id: gistId,
});
const commentNode = (gistComments.data as any)?.node;
assert.equal(commentNode?.id, gistId);
assert.ok(Array.isArray(commentNode?.comments?.nodes), 'comments 应该是数组');

const gistDetail = await query('GistDetail', GIST_DETAIL_QUERY, { id: gistId });
const gistDetailNode = (gistDetail.data as any)?.node;
assert.equal(gistDetailNode?.id, gistId);
assert.ok(Array.isArray(gistDetailNode?.files), 'files 应该是数组');
assert.equal(typeof gistDetailNode?.files?.[0]?.name, 'string');

const repoDir = await query('RepoPath', REPO_PATH_QUERY, {
  owner: 'Dnevend',
  name: 'classy-github',
  expression: 'HEAD:apps/web/src/lib',
});
assert.equal((repoDir.data as any)?.repository?.object?.__typename, 'Tree');
assert.ok((repoDir.data as any)?.repository?.object?.entries?.length > 0);

const repoFile = await query('RepoPath', REPO_PATH_QUERY, {
  owner: 'Dnevend',
  name: 'classy-github',
  expression: 'HEAD:README.md',
});
assert.equal((repoFile.data as any)?.repository?.object?.__typename, 'Blob');
assert.ok((repoFile.data as any)?.repository?.object?.text?.length > 0);

console.log('graphql smoke ok');
