import { GitHubError, getUser } from './github';
import type { User } from '@classy/types/github';

/**
 * 统一处理「用户不存在」：
 * 404 返回 null（由页面转成 404 状态），其余错误继续抛出。
 */
export async function loadUser(user: string): Promise<User | null> {
  try {
    return await getUser(user);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}
