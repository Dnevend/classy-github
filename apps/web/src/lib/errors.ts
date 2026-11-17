import { GitHubError } from './github-error.ts';

/**
 * 只有带限流元数据的 403/429 才算限流。
 * 普通 403 是 token 权限/配置问题，不能误导成“匿名请求过多”。
 */
export const isRateLimited = (error: unknown): error is GitHubError =>
  error instanceof GitHubError && error.rateLimit !== undefined;

export const isForbidden = (error: unknown): error is GitHubError =>
  error instanceof GitHubError &&
  (error.status === 401 || error.status === 403) &&
  error.rateLimit === undefined;

export const isNotFound = (error: unknown): error is GitHubError =>
  error instanceof GitHubError && error.status === 404;

export type LoadErrorKind = 'rate-limit' | 'forbidden' | 'not-found' | 'unknown';

export type Loaded<T> =
  | { data: T; error: null; retryAt?: undefined }
  | { data: null; error: LoadErrorKind; retryAt?: number };

const retryAtOf = (error: GitHubError): number | undefined => {
  const info = error.rateLimit;
  if (!info) return undefined;

  if (info.retryAfter !== undefined) {
    return Date.now() + info.retryAfter * 1000;
  }
  if (info.resetAt !== undefined) {
    return info.resetAt * 1000;
  }

  return undefined;
};

/**
 * 把「取数失败」变成页面可以渲染的状态，而不是一个 500。
 * 匿名配额用尽时 GitHub 返回 403，这条路径在线上会经常走到。
 */
export async function safeLoad<T>(
  loader: () => Promise<T>
): Promise<Loaded<T>> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    if (isRateLimited(error)) {
      return { data: null, error: 'rate-limit', retryAt: retryAtOf(error) };
    }
    if (isForbidden(error)) return { data: null, error: 'forbidden' };
    if (isNotFound(error)) return { data: null, error: 'not-found' };

    console.error('[classy] load failed:', error);
    return { data: null, error: 'unknown' };
  }
}
