import type { ThemeName } from './config.ts';
import type { UsersKv } from './users-kv.ts';

/**
 * 站点注册表（复用已有的 USERS KV）。
 *
 * 读路径使用单快照，避免每次 `/random`、`/webring`、`/api/ring/neighbors`
 * 都 list + 逐 key get 整张表：成员一多，KV 读会被放大 N 倍。
 *
 * 键设计：
 *   site:<login>       站点元数据（source of truth）
 *   ring:<login>       webring 成员（兼容旧读法）
 *   discover:<login>   允许出现在 /random（兼容旧读法）
 *   registry:ring      ring 快照（JSON，读路径只读这一个 key）
 *   registry:discover  discover 快照
 *
 * 快照只是读模型：丢失/损坏时可以从逐站点 key 重建；成员变化写少读多，
 * 所以接受 KV 的最终一致，不引入单例 DO。
 */

export const SITE_PREFIX = 'site:';
export const RING_PREFIX = 'ring:';
export const DISCOVER_PREFIX = 'discover:';

/** 元数据刷新间隔：配置改了，标题/主题最多 1 小时同步一次 */
const REFRESH_MS = 60 * 60 * 1000;

/** 快照最长使用 1 小时；超过后从逐站点 key 重建，顺便修复并发丢更新。 */
const SNAPSHOT_TTL_MS = 60 * 60 * 1000;

const SNAPSHOT_VERSION = 1;

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

type SitePrefix = typeof RING_PREFIX | typeof DISCOVER_PREFIX;

interface SiteSnapshot {
  version: number;
  updatedAt: number;
  sites: SiteRecord[];
}

const keyFor = (prefix: string, login: string) =>
  `${prefix}${login.toLowerCase()}`;

const snapshotKeyFor = (prefix: SitePrefix): string =>
  prefix === RING_PREFIX ? 'registry:ring' : 'registry:discover';

const byLogin = (a: SiteRecord, b: SiteRecord) =>
  a.login.localeCompare(b.login);

const normalizeRecord = (
  parsed: Partial<SiteRecord> | null | undefined
): SiteRecord | null => {
  if (!parsed || typeof parsed.login !== 'string' || !parsed.login) return null;

  return {
    login: parsed.login,
    title:
      typeof parsed.title === 'string'
        ? parsed.title.slice(0, 80)
        : parsed.login,
    theme: (parsed.theme ?? 'mac') as ThemeName,
    webring: parsed.webring === true,
    discover: parsed.discover === true,
    configuredAt: Number(parsed.configuredAt) || Date.now(),
    updatedAt: Number(parsed.updatedAt) || Date.now(),
  };
};

const parseRecord = (value: string | null): SiteRecord | null => {
  if (!value) return null;

  try {
    return normalizeRecord(JSON.parse(value) as Partial<SiteRecord>);
  } catch {
    return null;
  }
};

const parseSnapshot = (
  value: string | null,
  prefix: SitePrefix
): { records: SiteRecord[]; updatedAt: number } | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<SiteSnapshot>;
    if (
      parsed.version !== SNAPSHOT_VERSION ||
      !Array.isArray(parsed.sites)
    ) {
      return null;
    }

    const records = new Map<string, SiteRecord>();

    for (const item of parsed.sites) {
      const record = normalizeRecord(item as Partial<SiteRecord>);
      if (!record) continue;
      if (prefix === RING_PREFIX && !record.webring) continue;
      if (prefix === DISCOVER_PREFIX && !record.discover) continue;
      records.set(record.login.toLowerCase(), record);
    }

    return {
      records: [...records.values()].sort(byLogin),
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return null;
  }
};

const listSitesLegacy = async (
  kv: UsersKv,
  prefix: SitePrefix
): Promise<{ records: SiteRecord[]; complete: boolean }> => {
  const records = new Map<string, SiteRecord>();
  let cursor: string | undefined;
  let complete = true;

  for (let page = 0; page < 10; page += 1) {
    const result = await kv.list({ prefix, limit: 1000, cursor });

    await Promise.all(
      result.keys.map(async (key) => {
        const value = await kv.get(key.name).catch(() => {
          // 部分 key 读失败时不要把残缺列表写进快照，否则会缓存一小时。
          complete = false;
          return null;
        });
        const record = parseRecord(value);
        if (!record) return;
        if (prefix === RING_PREFIX && !record.webring) return;
        if (prefix === DISCOVER_PREFIX && !record.discover) return;
        records.set(record.login.toLowerCase(), record);
      })
    );

    if (result.list_complete || !result.cursor) break;
    cursor = result.cursor;
  }

  return { records: [...records.values()].sort(byLogin), complete };
};

const writeSnapshot = async (
  kv: UsersKv,
  prefix: SitePrefix,
  records: SiteRecord[]
): Promise<void> => {
  const payload: SiteSnapshot = {
    version: SNAPSHOT_VERSION,
    updatedAt: Date.now(),
    sites: records,
  };

  await kv.put(snapshotKeyFor(prefix), JSON.stringify(payload));
};

/** 读取新鲜快照；不存在、损坏或过期都返回 null，让调用方回退重建。 */
const readSnapshot = async (
  kv: UsersKv,
  prefix: SitePrefix
): Promise<SiteRecord[] | null> => {
  const parsed = parseSnapshot(await kv.get(snapshotKeyFor(prefix)), prefix);
  if (!parsed) return null;
  if (Date.now() - parsed.updatedAt > SNAPSHOT_TTL_MS) return null;
  return parsed.records;
};

/** 单条成员变化时更新快照；快照不存在/过期时先从逐站点 key 重建。 */
const updateSnapshot = async (
  kv: UsersKv,
  prefix: SitePrefix,
  login: string,
  record: SiteRecord | null
): Promise<void> => {
  const normalized = login.toLowerCase();
  let records = await readSnapshot(kv, prefix);

  if (!records) {
    const legacy = await listSitesLegacy(kv, prefix);
    if (!legacy.complete) {
      // 重建不完整时删掉旧快照，让下一次读取重新尝试，避免继续用陈旧列表。
      await kv.delete(snapshotKeyFor(prefix)).catch(() => undefined);
      return;
    }
    records = legacy.records;
  }

  const next = records.filter(
    (item) => item.login.toLowerCase() !== normalized
  );
  if (record) next.push(record);
  next.sort(byLogin);

  await writeSnapshot(kv, prefix, next);
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
    const title = record.title.slice(0, 80);

    const flagsChanged =
      !existing ||
      existing.webring !== record.webring ||
      existing.discover !== record.discover;
    const contentChanged =
      !existing || existing.title !== title || existing.theme !== record.theme;

    // 成员开关变化立即写；否则最多一小时刷新一次标题/主题。
    if (existing && !flagsChanged && now - existing.updatedAt < REFRESH_MS) {
      return;
    }

    // 一小时到了但标题/主题没变，不需要再写一遍。
    if (existing && !flagsChanged && !contentChanged) return;

    const valueObject: SiteRecord = {
      login,
      title,
      theme: record.theme,
      webring: record.webring,
      discover: record.discover,
      configuredAt: existing?.configuredAt ?? now,
      updatedAt: now,
    };
    const value = JSON.stringify(valueObject);

    await kv.put(siteKey, value);
    await (record.webring ? kv.put(ringKey, value) : kv.delete(ringKey));
    await (record.discover ? kv.put(discoverKey, value) : kv.delete(discoverKey));

    await updateSnapshot(
      kv,
      RING_PREFIX,
      login,
      record.webring ? valueObject : null
    );
    await updateSnapshot(
      kv,
      DISCOVER_PREFIX,
      login,
      record.discover ? valueObject : null
    );
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

    await updateSnapshot(kv, RING_PREFIX, normalized, null);
    await updateSnapshot(kv, DISCOVER_PREFIX, normalized, null);
  } catch (error) {
    console.warn(`[classy] 清理站点注册表失败 (${normalized}):`, error);
  }
};

/** 列出某个网站环前缀下的全部站点；优先读单快照，缺失时回退逐 key 读取 */
export const listSites = async (
  kv: UsersKv | undefined,
  prefix: SitePrefix
): Promise<SiteRecord[]> => {
  if (!kv) return [];

  try {
    const snapshot = await readSnapshot(kv, prefix);
    if (snapshot) return snapshot;
  } catch (error) {
    console.warn(`[classy] 读取站点快照失败 (${prefix}):`, error);
  }

  try {
    const { records, complete } = await listSitesLegacy(kv, prefix);
    // 首次访问或快照损坏时回填；读不完整时不写，避免缓存残缺列表。
    if (complete) {
      await writeSnapshot(kv, prefix, records).catch((error) => {
        console.warn(`[classy] 回填站点快照失败 (${prefix}):`, error);
      });
    }
    return records;
  } catch (error) {
    console.warn(`[classy] 读取站点列表失败 (${prefix}):`, error);
    return [];
  }
};
