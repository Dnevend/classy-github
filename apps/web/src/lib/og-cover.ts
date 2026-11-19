/**
 * OG 封面抓取的边界。
 *
 * `profile.cover` 可以是站内路径，OG 渲染时会在 Worker 里回源抓取。
 * 如果路径本身又指向 `/og/...`，就会递归生成 OG 图；同源的 `/api`、
 * `/card` 等动态路由也不应该被当成静态封面。这里集中列出禁止的路径，
 * 同时给调用方提供超时和大小上限。
 */

export const OG_FETCH_HEADER = 'x-classy-og-fetch';

/** 内部抓取头：嵌套的 OG 请求看到它就直接拒绝，作为路径检查之外的第二道闸。 */
export const isOgFetchRequest = (request: Request): boolean =>
  request.headers.get(OG_FETCH_HEADER) === '1';

/** 这些同源路径不是静态资源，不能作为封面回源。 */
const BLOCKED_PREFIXES = [
  '/og/',
  '/api/',
  '/card/',
  '/badge/',
  '/setup',
  '/claim/',
  '/random',
  '/sitemap',
  '/sitemap.xml',
  '/robots.txt',
];

const decodePathOnce = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const isBlockedSameOriginCoverPath = (pathname: string): boolean => {
  const candidates = [pathname, decodePathOnce(pathname)];

  return candidates.some((candidate) =>
    BLOCKED_PREFIXES.some((prefix) => {
      const root = prefix.replace(/\/$/, '');
      const nested = `${root}/`;
      return candidate === root || candidate.startsWith(nested);
    })
  );
};

/** 封面/头像的抓取上限；超过就当作没有图，避免把 Worker 内存打满。 */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const OG_FETCH_TIMEOUT_MS = 5000;

/**
 * 流式读取并限制大小：超过上限立刻 cancel，不把整张图读进内存。
 * 导出是为了在 node smoke 里直接断言超限/Content-Length 分支。
 */
export const readBoundedBody = async (
  response: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> => {
  const declared = Number(response.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }

      chunks.push(value);
    }
  } catch {
    return null;
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body.buffer;
};
