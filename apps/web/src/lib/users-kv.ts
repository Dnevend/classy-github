/**
 * 「可索引用户」注册表（Workers KV）。
 *
 * sitemap 需要知道有哪些用户页，但用户名集合是无限的、也不能枚举 GitHub，
 * 所以在渲染时把选择被索引的用户记下来（`seo.index: true`）。
 */

import { env } from 'cloudflare:workers';

const PREFIX = 'index:';

export interface UsersKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

/** 取 KV 绑定；没有绑定或不在 Workers 运行时里返回 undefined */
export const usersKv = (): UsersKv | undefined => {
  try {
    return (env as { USERS?: UsersKv }).USERS;
  } catch {
    return undefined;
  }
};

const REFRESH_MS = 60 * 60 * 1000;

/**
 * 让注册表与配置保持一致：该索引的写进去，不该索引的删掉。
 * 先读再写，避免每次渲染都产生一次 KV 写（免费额度是 1000 写/天）。
 */
export const syncIndexableUser = async (
  kv: UsersKv | undefined,
  login: string,
  indexable: boolean
): Promise<void> => {
  if (!kv) return;

  const key = `${PREFIX}${login.toLowerCase()}`;

  try {
    const existing = await kv.get(key);

    if (indexable) {
      if (existing) {
        const updatedAt = Number(JSON.parse(existing).updatedAt ?? 0);
        if (Date.now() - updatedAt < REFRESH_MS) return;
      }
      await kv.put(key, JSON.stringify({ updatedAt: Date.now() }));
      return;
    }

    if (existing) await kv.delete(key);
  } catch (error) {
    console.warn('[classy] 同步用户索引失败:', error);
  }
};

/** 列出全部可索引用户（KV list 单页上限 1000，超出部分分页拉取） */
export const listIndexableUsers = async (
  kv: UsersKv | undefined
): Promise<string[]> => {
  if (!kv) return [];

  const logins: string[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const result = await kv.list({ prefix: PREFIX, limit: 1000, cursor });
    logins.push(...result.keys.map((key) => key.name.slice(PREFIX.length)));
    if (result.list_complete || !result.cursor) break;
    cursor = result.cursor;
  }

  return logins.sort();
};
