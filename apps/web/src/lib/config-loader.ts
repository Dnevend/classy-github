import { USER_AGENT } from './constants.ts';
import {
  DEFAULT_CONFIG,
  isConfigForUser,
  parseConfig,
  type ResolvedConfig,
} from './config.ts';
import { cacheGet, cacheGetStale, cachePut } from './edge-cache.ts';
import { hasGitHubToken } from './github-auth.ts';
import { ghGraphql } from './graphql.ts';
import { CONFIG_QUERY } from './graphql-queries.ts';

const CONFIG_REPO = 'classy-github';
const CONFIG_FILE = 'classy.config.json';
const CONFIG_TTL = 300;
/** 明确 404 的负缓存：没有 fork 的用户不应该每次渲染都探测一遍。 */
const MISSING_TTL = 300;
/** 网络/限流时用旧配置兜底，避免主题突然掉回 mac。 */
const STALE_TTL = 60 * 60 * 24;

/**
 * 兜底分支顺序：HEAD 会跟随 fork 的默认分支（develop/v1 也能覆盖），
 * 后面三个是历史 fork 的兜底。raw 不吃 API 配额。
 */
const FALLBACK_BRANCHES = ['HEAD', 'main', 'master', 'v2'];

interface ConfigPayload {
  /** found = 文件存在；missing = 明确的 404；error = 网络/限流/5xx，不能下结论 */
  status: 'found' | 'missing' | 'error';
  value: unknown;
}

const jsonResponse = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const parseCached = async (cached: Response): Promise<ConfigPayload> => {
  try {
    const value = await cached.json();
    if (
      value &&
      typeof value === 'object' &&
      (value as { __classy?: unknown }).__classy === 'missing'
    ) {
      return { status: 'missing', value: null };
    }
    return { status: 'found', value };
  } catch {
    return { status: 'found', value: null };
  }
};

const fetchJsonWithCache = async (
  url: string,
  ttl = CONFIG_TTL,
  fresh = false
): Promise<ConfigPayload> => {
  const key = new Request(url, { method: 'GET' });

  if (!fresh) {
    const cached = await cacheGet(key, ttl);
    if (cached) return parseCached(cached);
  }

  let res: Response;

  try {
    res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  } catch {
    const stale = await cacheGetStale(key, STALE_TTL);
    const payload = stale ? await parseCached(stale) : null;
    // 旧缓存里如果是“missing”标记，不能拿来当作现在的结论；
    // 当前请求失败时只能标记 error，交给调用方保守处理。
    return payload?.status === 'found'
      ? payload
      : { status: 'error', value: null };
  }

  // 只有明确的 404 才能判断「没有配置」；
  // 503/429/网络错误不能拿来清理 webring 成员。
  if (res.status === 404) {
    await cachePut(key, jsonResponse({ __classy: 'missing' }), MISSING_TTL);
    return { status: 'missing', value: null };
  }
  if (!res.ok) {
    const stale = await cacheGetStale(key, STALE_TTL);
    const payload = stale ? await parseCached(stale) : null;
    return payload?.status === 'found'
      ? payload
      : { status: 'error', value: null };
  }

  const response = new Response(res.body, res);
  // 逻辑 TTL 之外还要留 stale 窗口，raw 网络抖动时才能用旧配置兜底。
  await cachePut(key, response, ttl, STALE_TTL);

  return parseCached(response);
};

export interface ConfigState {
  config: ResolvedConfig;
  /** 用户是否真的在 GitHub 上放了属于自己（owner 匹配）的 classy.config.json */
  configured: boolean;
  /** false 表示配置读取遇到网络/限流，不能据此判断「未认领」 */
  reliable: boolean;
  source: 'repo' | 'template' | 'default';
}

interface ConfigQueryData {
  user: {
    repository: {
      object: { text?: string | null } | null;
    } | null;
  } | null;
}

const loadConfigFromGraphql = async (
  user: string,
  fresh: boolean
): Promise<ConfigPayload> => {
  const data = await ghGraphql<ConfigQueryData>(
    'Config',
    CONFIG_QUERY,
    { login: user },
    { ttl: CONFIG_TTL, fresh }
  );

  // `HEAD:` 就是默认分支；文件不存在时 object 为 null。
  const text = data.user?.repository?.object?.text;
  if (!text) return { status: 'missing', value: null };

  try {
    return { status: 'found', value: JSON.parse(text) };
  } catch {
    return { status: 'found', value: null };
  }
};

const resolvePayload = (
  user: string,
  payload: ConfigPayload
): ConfigState | null => {
  if (payload.status !== 'found') return null;

  if (payload.value === null) {
    console.warn(`[classy] ${user} 的 ${CONFIG_FILE} 不是合法 JSON，已回退默认值`);
  }

  const { config, issues } = parseConfig(payload.value);
  if (issues.length > 0) {
    console.warn(`[classy] ${user} 的 ${CONFIG_FILE} 有问题：`, issues);
  }

  // fork 会继承作者的配置；owner 不匹配时视为模板，避免把作者的主题、
  // 链接、webring 身份复制到别人的站点上。
  if (!isConfigForUser(config, user)) {
    console.warn(
      `[classy] ${user} 的配置 owner=${config.owner}，视为作者的模板配置`
    );
    return {
      config: DEFAULT_CONFIG,
      configured: false,
      reliable: true,
      source: 'template',
    };
  }

  return { config, configured: true, reliable: true, source: 'repo' };
};

/**
 * 读取并校验配置，同时告诉调用方「这个站点有没有被认领」。
 *
 * 这一步是 claim / webring / hit counter 的基础：
 * - 没配置 → 显示「把它变成你自己的」；
 * - 文件存在但 JSON 坏了 → 仍算已认领，避免反复骚扰；
 * - 读取失败 → reliable=false，不清理注册表、不显示 claim。
 */
export interface ConfigLoadOptions {
  /** 配置生成器 / 预览用：跳过配置边缘缓存，直接读 GitHub */
  fresh?: boolean;
  /**
   * 请求级 memo。middleware 和页面共享同一个 Map，避免一次请求里
   * 重复读 Config（预览页尤其明显）。
   */
  memo?: Map<string, Promise<ConfigState>>;
}

const memoKey = (user: string, fresh: boolean): string =>
  `${user.toLowerCase()}|${fresh ? 'fresh' : 'cached'}`;

const loadConfigStateUncached = async (
  user: string,
  options: ConfigLoadOptions = {}
): Promise<ConfigState> => {
  let hadError = false;

  // 有 token 时优先走 GraphQL：一次请求拿到默认分支上的配置文件，
  // 不消耗 REST 配额，也不依赖 raw.githubusercontent.com 的出口 IP。
  if (hasGitHubToken()) {
    try {
      const payload = await loadConfigFromGraphql(
        user,
        options.fresh ?? false
      );
      const resolved = resolvePayload(user, payload);
      if (resolved) return resolved;

      if (payload.status === 'missing') {
        return {
          config: DEFAULT_CONFIG,
          configured: false,
          reliable: true,
          source: 'default',
        };
      }

      hadError = true;
    } catch (error) {
      hadError = true;
      console.warn(
        `[classy] ${user} 配置 GraphQL 读取失败，回退 raw：`,
        (error as Error).message
      );
    }
  }

  // 没有 token / GraphQL 失败时回退 raw。
  // 先试 HEAD（默认分支），再试历史 fork 常见的 main / master / v2；
  // raw 不吃 API 配额，自定义默认分支也能覆盖。
  for (const branch of FALLBACK_BRANCHES) {
    const url = `https://raw.githubusercontent.com/${user}/${CONFIG_REPO}/${branch}/${CONFIG_FILE}`;

    const payload = await fetchJsonWithCache(
      url,
      CONFIG_TTL,
      options.fresh ?? false
    ).catch((): ConfigPayload => ({ status: 'error', value: null }));

    const resolved = resolvePayload(user, payload);
    if (resolved) return resolved;

    if (payload.status === 'error') hadError = true;
  }

  return {
    config: DEFAULT_CONFIG,
    configured: false,
    reliable: !hadError,
    source: 'default',
  };
};

/**
 * 请求级 memo 包装：同一个 Map 里同 user/fresh 只执行一次。
 * 没有 memo 时保持原来的行为。
 */
export const loadConfigState = (
  user: string,
  options: ConfigLoadOptions = {}
): Promise<ConfigState> => {
  const { memo } = options;
  if (!memo) return loadConfigStateUncached(user, options);

  const key = memoKey(user, options.fresh ?? false);
  const cached = memo.get(key);
  if (cached) return cached;

  const promise = loadConfigStateUncached(user, options);
  memo.set(key, promise);
  void promise.catch(() => memo.delete(key));

  return promise;
};

/**
 * 兼容旧调用方：只要配置，不关心认领状态。
 * 新代码优先用 `loadConfigState`。
 */
export const loadConfig = async (
  user: string,
  options: ConfigLoadOptions = {}
): Promise<ResolvedConfig> => (await loadConfigState(user, options)).config;
