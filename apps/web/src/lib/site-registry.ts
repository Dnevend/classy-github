import type { ThemeName } from './config.ts';
import type { UsersKv } from './users-kv.ts';

/**
 * 站点注册表（复用已有的 USERS KV）。
 *
 * 为什么不用 D1：
 * - webring / 随机推荐只是很小的列表，KV 的 list + get 足够；
 * - 计数用 Durable Object 保证原子性，不需要额外的数据库。
 *
 * 键设计：
 *   site:<login>      站点元数据
 *   ring:<login>      webring 成员（值与 site 相同，便于直接 list）
 *   discover:<login>  允许出现在 /random
 */

export const SITE_PREFIX = 'site:';
export const RING_PREFIX = 'ring:';
export const DISCOVER_PREFIX = 'discover:';

/** 元数据刷新间隔：配置改了，标题/主题最多 1 小时同步一次 */
const REFRESH_MS = 60 * 60 * 1000;

export interface SiteRecord {
  login: string;
  /** GitHub 显示名，最多 80 字 */
  title: string;
  theme: ThemeName;
  webring: boolean;
  discover: boolean;
  configuredAt: number;
  updatedAt: number;
}

const keyFor = (prefix: string, login: string) =>
  `${prefix}${login.toLowerCase()}`;

const parseRecord = (value: string | null): SiteRecord | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<SiteRecord>;
    if (typeof parsed.login !== 'string' || !parsed.login) return null;

    return {
      login: parsed.login,
      title: typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : parsed.login,
      theme: (parsed.theme ?? 'mac') as ThemeName,
      webring: parsed.webring === true,
      discover: parsed.discover === true,
      configuredAt: Number(parsed.configuredAt) || Date.now(),
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
};

/**
 * 同步站点元数据。只在用户主页调用，且只在 `configured` 时写入。
 * 失败不影响页面渲染。
 */
export const syncSite = async (
  kv: UsersKv | undefined,
  record: Omit<SiteRecord, 'configuredAt' | 'updatedAt'>
): Promise<void> => {
  if (!kv) return;

  const login = record.login.toLowerCase();
  const siteKey = keyFor(SITE_PREFIX, login);
  const ringKey = keyFor(RING_PREFIX, login);
  const discoverKey = keyFor(DISCOVER_PREFIX, login);

  try {
    const existing = parseRecord(await kv.get(siteKey));
    const now = Date.now();

    const flagsChanged =
      !existing ||
      existing.webring !== record.webring ||
      existing.discover !== record.discover;

    // 成员开关变化立即写；否则最多一小时刷新一次标题/主题
    if (!flagsChanged && now - existing.updatedAt < REFRESH_MS) return;

    const value = JSON.stringify({
      login,
      title: record.title.slice(0, 80),
      theme: record.theme,
      webring: record.webring,
      discover: record.discover,
      configuredAt: existing?.configuredAt ?? now,
      updatedAt: now,
    } satisfies SiteRecord);

    await kv.put(siteKey, value);
    await (record.webring ? kv.put(ringKey, value) : kv.delete(ringKey));
    await (record.discover ? kv.put(discoverKey, value) : kv.delete(discoverKey));
  } catch (error) {
    console.warn(`[classy] 同步站点注册表失败 (${login}):`, error);
  }
};

/** 用户撤掉配置后，从 webring/随机推荐里移除 */
export const removeSite = async (
  kv: UsersKv | undefined,
  login: string
): Promise<void> => {
  if (!kv) return;

  const normalized = login.toLowerCase();

  try {
    // 没有 site 记录就不做多余的写操作
    if (!(await kv.get(keyFor(SITE_PREFIX, normalized)))) return;

    await kv.delete(keyFor(SITE_PREFIX, normalized));
    await kv.delete(keyFor(RING_PREFIX, normalized));
    await kv.delete(keyFor(DISCOVER_PREFIX, normalized));
  } catch (error) {
    console.warn(`[classy] 清理站点注册表失败 (${normalized}):`, error);
  }
};

/** 列出某个前缀下的全部站点；KV 单页上限 1000，按游标分页 */
export const listSites = async (
  kv: UsersKv | undefined,
  prefix: typeof RING_PREFIX | typeof DISCOVER_PREFIX
): Promise<SiteRecord[]> => {
  if (!kv) return [];

  const records = new Map<string, SiteRecord>();
  let cursor: string | undefined;

  try {
    for (let page = 0; page < 10; page += 1) {
      const result = await kv.list({ prefix, limit: 1000, cursor });

      await Promise.all(
        result.keys.map(async (key) => {
          const value = await kv.get(key.name).catch(() => null);
          const record = parseRecord(value);
          if (record) records.set(record.login.toLowerCase(), record);
        })
      );

      if (result.list_complete || !result.cursor) break;
      cursor = result.cursor;
    }
  } catch (error) {
    console.warn(`[classy] 读取站点列表失败 (${prefix}):`, error);
  }

  return [...records.values()].sort((a, b) =>
    a.login.localeCompare(b.login)
  );
};
