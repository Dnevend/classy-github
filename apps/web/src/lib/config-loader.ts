import { USER_AGENT } from './constants.ts';
import { getDefaultBranch } from './github.ts';
import { DEFAULT_CONFIG, parseConfig, type ResolvedConfig } from './config.ts';
import { cacheGet, cachePut } from './edge-cache.ts';

const CONFIG_REPO = 'classy-github';
const CONFIG_FILE = 'classy.config.json';
const CONFIG_TTL = 300;

/** 兜底分支顺序：拿不到仓库元信息时用 */
const FALLBACK_BRANCHES = ['main', 'master'];

const fetchJsonWithCache = async (
  url: string,
  ttl = CONFIG_TTL
): Promise<unknown | null> => {
  const key = new Request(url, { method: 'GET' });

  const cached = await cacheGet(key, ttl);
  if (cached) return cached.json().catch(() => null);

  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
  });

  if (!res.ok) return null;

  const response = new Response(res.body, res);
  await cachePut(key, response, ttl);

  return response.json().catch(() => null);
};

/**
 * 读取并校验配置。**不会抛异常**：任何失败都退回默认值。
 * 缓存 5 分钟（原来是 localStorage 永不过期，导致改了配置不生效）。
 */
export const loadConfig = async (user: string): Promise<ResolvedConfig> => {
  // fork 的默认分支可能是 main / master / v2 / 任意名字，
  // 先问 GitHub 拿到 default_branch，再按它 + 兜底顺序尝试。
  const defaultBranch = await getDefaultBranch(user).catch(() => null);

  const branches = [
    ...(defaultBranch ? [defaultBranch] : []),
    ...FALLBACK_BRANCHES.filter((branch) => branch !== defaultBranch),
  ];

  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${user}/${CONFIG_REPO}/${branch}/${CONFIG_FILE}`;

    const raw = await fetchJsonWithCache(url).catch(() => null);
    if (raw === null) continue;

    const { config, issues } = parseConfig(raw);
    if (issues.length > 0) {
      console.warn(`[classy] ${user} 的 ${CONFIG_FILE} 有问题：`, issues);
    }

    return config;
  }

  return DEFAULT_CONFIG;
};
