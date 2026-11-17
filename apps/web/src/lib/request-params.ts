/**
 * 查询参数进入缓存键之前先规范化。
 *
 * `?tag=` 和 `?page=` 是任意输入；如果原样拼进缓存键，就能生成无限多个
 * 缓存条目，每次都触发一次完整渲染。这里做三件事：
 * - tag 统一小写、去空白、限制长度、拒绝控制字符；
 * - page 只接受 1..MAX_CACHE_PAGE，超出范围的值回退到边界；
 * - 非法值归一化到安全值，复用同一个缓存键，不跳过缓存。
 */

export const MAX_CACHE_PAGE = 100;
/** 与 gist-rule 的标签语法保持一致：1–32 个字母/数字/下划线/连字符。 */
export const MAX_CACHE_TAG_LENGTH = 32;
const TAG_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export interface NormalizedPage {
  present: boolean;
  valid: boolean;
  value?: number;
}

export interface NormalizedTag {
  present: boolean;
  valid: boolean;
  value?: string;
}

export const normalizePageParam = (
  raw: string | null
): NormalizedPage => {
  if (raw === null) return { present: false, valid: true };

  const trimmed = raw.trim();
  if (!trimmed) return { present: true, valid: true, value: 1 };

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { present: true, valid: false, value: 1 };
  }

  if (parsed > MAX_CACHE_PAGE) {
    return { present: true, valid: false, value: MAX_CACHE_PAGE };
  }

  return { present: true, valid: true, value: parsed };
};

export const normalizeTagParam = (
  raw: string | null
): NormalizedTag => {
  if (raw === null) return { present: false, valid: true };

  const value = raw.trim().toLowerCase();
  if (!value) return { present: true, valid: true };

  if (
    [...value].length > MAX_CACHE_TAG_LENGTH ||
    !TAG_PATTERN.test(value)
  ) {
    return { present: true, valid: false };
  }

  return { present: true, valid: true, value };
};

/**
 * 只有真正消费该参数的页面才把它放进缓存键：
 * - `/repos` 用 page；
 * - `/gists` 用 tag；
 * 其它页面上的同名 query 一律忽略，避免同一内容产生多份缓存。
 */
export const normalizeCacheParams = (
  pathname: string,
  params: URLSearchParams
): { page: NormalizedPage; tag: NormalizedTag } => ({
  page: /\/repos\/?$/.test(pathname)
    ? normalizePageParam(params.get('page'))
    : { present: false, valid: true },
  tag: /\/gists\/?$/.test(pathname)
    ? normalizeTagParam(params.get('tag'))
    : { present: false, valid: true },
});
