import { USER_AGENT } from './constants.ts';
import { cacheGet, cacheGetStale, cachePut } from './edge-cache.ts';
import { getGitHubToken } from './github-auth.ts';
import { GitHubError } from './github-error.ts';
import { parseRateLimit } from './github-rate-limit.ts';
import {
  readRateLimitMarker,
  writeRateLimitMarker,
} from './github-rate-limit-marker.ts';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const DEFAULT_TTL = 300;
/** GraphQL 失败时最多拿多旧的结果兜底。 */
const STALE_TTL = 60 * 60 * 24;

export interface GraphQLErrorPayload {
  message: string;
  type?: string;
  path?: (string | number)[];
}

interface GraphQLPayload<T> {
  data?: T | null;
  errors?: GraphQLErrorPayload[];
}

/**
 * GraphQL 是 POST，Workers Cache API 只方便缓存 GET，所以用
 * “operation + 排序后的变量”合成一个 GET key。token 不能进 key。
 */
const cacheKey = (
  operation: string,
  variables: Record<string, unknown>
): Request => {
  const params = new URLSearchParams();

  for (const name of Object.keys(variables).sort()) {
    const value = variables[name];
    if (value !== undefined) params.set(name, String(value));
  }
  params.set('v', '1');

  return new Request(
    `https://classy.cache/graphql/${operation}?${params.toString()}`,
    { method: 'GET' }
  );
};

const staleData = async <T>(key: Request): Promise<T | undefined> => {
  const stale = await cacheGetStale(key, STALE_TTL);
  if (!stale) return undefined;

  return (await stale.json().catch(() => undefined)) as T | undefined;
};

/**
 * 带边缘缓存的 GraphQL 读取。
 *
 * - `data` 有值时返回 `data`，部分 `errors` 只打日志（GitHub 会在
 *   `repository` 不存在时返回 `data.user.repository = null` + NOT_FOUND）。
 * - `data` 为空时抛错，避免页面把半截数据当成完整数据。
 * - 限流 / 5xx / 网络错误时优先返回旧缓存。
 */
export async function ghGraphql<T>(
  operation: string,
  query: string,
  variables: Record<string, unknown>,
  options: { ttl?: number; fresh?: boolean } = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, fresh = false } = options;
  const key = cacheKey(operation, variables);

  if (!fresh) {
    const cached = await cacheGet(key, ttl);
    if (cached) return (await cached.json()) as T;
  }

  const token = await getGitHubToken();
  if (!token) {
    throw new GitHubError(401, 'GITHUB_TOKEN is not configured');
  }

  // 已经确认 GraphQL 配额耗尽：直接走旧缓存或快速失败。
  const rateMarker = await readRateLimitMarker('graphql');
  if (rateMarker) {
    const stale = await staleData<T>(key);
    if (stale !== undefined) {
      console.warn(
        `[classy] GraphQL rate limit active, serving stale ${operation}`
      );
      return stale;
    }

    throw new GitHubError(
      403,
      `GitHub GraphQL rate limit active until ${new Date(rateMarker.until * 1000).toISOString()} for ${operation}`,
      {
        rateLimit: {
          resetAt: rateMarker.resetAt,
          retryAfter: rateMarker.retryAfter,
        },
      }
    );
  }

  let res: Response;

  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    const stale = await staleData<T>(key);
    if (stale !== undefined) {
      console.warn(`[classy] GraphQL network error, serving stale ${operation}`);
      return stale;
    }

    throw new GitHubError(
      502,
      `GitHub GraphQL network error for ${operation}: ${(error as Error).message}`
    );
  }

  const body = await res.text().catch(() => '');
  let payload: GraphQLPayload<T> | null = null;

  try {
    payload = JSON.parse(body) as GraphQLPayload<T>;
  } catch {
    payload = null;
  }

  const errorText = (payload?.errors ?? [])
    .map((error) => `${error.type ?? ''} ${error.message}`)
    .join(' ');

  // 只在这两种情况下判断限流：
  // - HTTP 非 2xx（看响应体）
  // - 200 但没有 data（看 GraphQL errors）
  // 不要把整个 data body 喂给正则：用户 bio / 仓库描述里出现
  // “abuse”“rate limit” 不应该让整页变成限流错误。
  const rateLimit = !res.ok
    ? parseRateLimit(res, body)
    : payload?.data == null
      ? // 200 但没有 data：只看 GraphQL errors 的文案，不看响应头。
        // remaining=0 可能只是窗口最后一次成功请求的正常响应头。
        parseRateLimit(res, errorText, { headers: false })
      : undefined;

  if (rateLimit) {
    console.warn('[classy] github rate-limit', {
      resource: 'graphql',
      operation,
      status: res.status,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
      retryAfter: rateLimit.retryAfter,
    });
    await writeRateLimitMarker('graphql', rateLimit, res.status);

    const stale = await staleData<T>(key);
    if (stale !== undefined) {
      console.warn(`[classy] GraphQL rate limited, serving stale ${operation}`);
      return stale;
    }

    throw new GitHubError(
      res.status === 429 ? 429 : 403,
      `GitHub GraphQL rate limit for ${operation} — ${body.slice(0, 160)}`,
      { rateLimit }
    );
  }

  if (!res.ok) {
    if (res.status === 401 || res.status >= 500) {
      const stale = await staleData<T>(key);
      if (stale !== undefined) {
        console.warn(
          `[classy] GraphQL ${res.status}, serving stale ${operation}`
        );
        return stale;
      }
    }

    throw new GitHubError(
      res.status,
      `GitHub GraphQL ${res.status} ${res.statusText} for ${operation} — ${body.slice(0, 160)}`
    );
  }

  if (!payload || payload.data === undefined || payload.data === null) {
    const stale = await staleData<T>(key);
    if (stale !== undefined) {
      console.warn(`[classy] GraphQL empty data, serving stale ${operation}`);
      return stale;
    }

    const message = (payload?.errors ?? [])
      .map((error) => error.message)
      .join('; ');

    throw new GitHubError(
      502,
      `GitHub GraphQL returned no data for ${operation}${message ? ` — ${message}` : ''}`
    );
  }

  if (payload.errors?.length) {
    const unexpected = payload.errors.filter(
      (error) => error.type !== 'NOT_FOUND'
    );
    if (unexpected.length > 0) {
      console.warn(
        `[classy] GitHub GraphQL ${operation} partial errors:`,
        unexpected.map((error) => error.message).join('; ')
      );
    }
  }

  const response = new Response(JSON.stringify(payload.data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
  await cachePut(key, response, ttl);

  return payload.data;
}
