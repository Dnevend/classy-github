import type { User } from '@classy/types/github';

/**
 * GitHub 头像 URL 的统一入口。
 *
 * - `avatar_url` 为空时回退到 `github.com/<login>.png`（会 302 到头像 CDN），
 *   避免 `src=""` 把当前页面当成图片请求。
 * - 不对已有 URL 追加 `s=`：实测原图 38KB，`s=128` 反而 75KB，
 *   而且不同尺寸会拆成多个浏览器缓存 key，得不偿失。
 */
const clampSize = (size: number | undefined): number => {
  if (size === undefined || !Number.isFinite(size)) return 64;
  return Math.min(512, Math.max(16, Math.floor(size)));
};

export const avatarUrlForLogin = (login: string, size = 64): string =>
  `https://github.com/${encodeURIComponent(login)}.png?size=${clampSize(size)}`;

export const avatarUrl = (
  user: Pick<User, 'login' | 'avatar_url'>,
  size = 64
): string => user.avatar_url?.trim() || avatarUrlForLogin(user.login, size);
