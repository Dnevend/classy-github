import { GitHubError } from './github';

export const isRateLimited = (error: unknown) =>
  error instanceof GitHubError && (error.status === 403 || error.status === 429);

export const isNotFound = (error: unknown) =>
  error instanceof GitHubError && error.status === 404;

export type LoadErrorKind = 'rate-limit' | 'not-found' | 'unknown';

export type Loaded<T> =
  | { data: T; error: null }
  | { data: null; error: LoadErrorKind };

/**
 * 把「取数失败」变成页面可以渲染的状态，而不是一个 500。
 * 匿名配额用尽时 GitHub 返回 403，这条路径在线上会经常走到。
 */
export async function safeLoad<T>(loader: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    if (isRateLimited(error)) return { data: null, error: 'rate-limit' };
    if (isNotFound(error)) return { data: null, error: 'not-found' };

    console.error('[classy] load failed:', error);
    return { data: null, error: 'unknown' };
  }
}
