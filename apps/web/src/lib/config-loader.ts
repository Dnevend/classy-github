import { USER_AGENT } from './constants.ts';
import { getDefaultBranch } from './github.ts';
import { DEFAULT_CONFIG, parseConfig, type ResolvedConfig } from './config.ts';
import { cacheGet, cachePut } from './edge-cache.ts';

const CONFIG_REPO = 'classy-github';
const CONFIG_FILE = 'classy.config.json';
const CONFIG_TTL = 300;

/** 兜底分支顺序：拿不到仓库元信息时用（v2 是本仓库当前的默认分支） */
const FALLBACK_BRANCHES = ['main', 'master', 'v2'];

interface ConfigPayload {
  /** found = 文件存在；missing = 明确的 404；error = 网络/限流/5xx，不能下结论 */
  status: 'found' | 'missing' | 'error';
  value: unknown;
}

const fetchJsonWithCache = async (
  url: string,
  ttl = CONFIG_TTL
): Promise<ConfigPayload> => {
  const key = new Request(url, { method: 'GET' });

  const cached = await cacheGet(key, ttl);
  if (cached) {
    try {
      return { status: 'found', value: await cached.json() };
    } catch {
      return { status: 'found', value: null };
    }
  }

  let res: Response;

  try {
    res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  } catch {
    return { status: 'error', value: null };
  }

  // 只有明确的 404 才能判断「没有配置」；
  // 503/429/网络错误不能拿来清理 webring 成员。
  if (res.status === 404) return { status: 'missing', value: null };
  if (!res.ok) return { status: 'error', value: null };

  const response = new Response(res.body, res);
  await cachePut(key, response, ttl);

  try {
    return { status: 'found', value: await response.json() };
  } catch {
    return { status: 'found', value: null };
  }
};

export interface ConfigState {
  config: ResolvedConfig;
  /** 用户是否真的在 GitHub 上放了 classy.config.json */
  configured: boolean;
  /** false 表示配置读取遇到网络/限流，不能据此判断「未认领」 */
  reliable: boolean;
  source: 'repo' | 'default';
}

/**
 * 读取并校验配置，同时告诉调用方「这个站点有没有被认领」。
 *
 * 这一步是 claim / webring / hit counter 的基础：
 * - 没配置 → 显示「把它变成你自己的」；
 * - 文件存在但 JSON 坏了 → 仍算已认领，避免反复骚扰；
 * - 读取失败 → reliable=false，不清理注册表、不显示 claim。
 */
export const loadConfigState = async (user: string): Promise<ConfigState> => {
  let hadError = false;

  // fork 的默认分支可能是 main / master / v2 / 任意名字，
  // 先问 GitHub 拿到 default_branch，再按它 + 兜底顺序尝试。
  const defaultBranch = await getDefaultBranch(user).catch(() => {
    hadError = true;
    return null;
  });

  const branches = [
    ...(defaultBranch ? [defaultBranch] : []),
    ...FALLBACK_BRANCHES.filter((branch) => branch !== defaultBranch),
  ];

  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${user}/${CONFIG_REPO}/${branch}/${CONFIG_FILE}`;

    const payload = await fetchJsonWithCache(url).catch(
      (): ConfigPayload => ({ status: 'error', value: null })
    );

    if (payload.status === 'missing') continue;
    if (payload.status === 'error') {
      hadError = true;
      continue;
    }

    if (payload.value === null) {
      console.warn(`[classy] ${user} 的 ${CONFIG_FILE} 不是合法 JSON，已回退默认值`);
    }

    const { config, issues } = parseConfig(payload.value);
    if (issues.length > 0) {
      console.warn(`[classy] ${user} 的 ${CONFIG_FILE} 有问题：`, issues);
    }

    return { config, configured: true, reliable: true, source: 'repo' };
  }

  return {
    config: DEFAULT_CONFIG,
    configured: false,
    reliable: !hadError,
    source: 'default',
  };
};

/**
 * 兼容旧调用方：只要配置，不关心认领状态。
 * 新代码优先用 `loadConfigState`。
 */
export const loadConfig = async (user: string): Promise<ResolvedConfig> =>
  (await loadConfigState(user)).config;
