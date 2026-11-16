/**
 * GitHub Markdown 里相对链接的站内重写。
 *
 * README 里的 `docs/issue-419.md` 在 GitHub 上指「仓库根目录下的 docs 文件」，
 * 直接丢给浏览器却会按当前页面 URL 解析，变成 `/{user}/repo/docs/issue-419.md`
 * ——少了仓库名，站内也没有对应路由，于是 404。
 *
 * 这里按「当前 Markdown 文件在仓库内的位置」解析相对路径，再改写成：
 * - 同仓库的 Markdown / 目录 / 未知路径 → 站内文件页；
 * - 静态资源（图片、压缩包等）→ raw.githubusercontent.com；
 * - 绝对地址、锚点、mailto 等 → 原样保留。
 */

export interface RepoLinkContext {
  login: string;
  repo: string;
  /** 当前 Markdown 文件在仓库内的路径，例如 `README.md` 或 `docs/issue-419.md` */
  path: string;
}

export interface RepoLinkTarget {
  href: string;
  /** 是否指向站外（raw GitHub） */
  external: boolean;
}

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;

export const isAbsoluteHref = (href: string) =>
  ABSOLUTE.test(href) || href.startsWith('//');

/** 这些文件不进站内渲染，直接给 raw 地址，点开就是原文件 */
const ASSET_EXT =
  /\.(?:avif|bmp|eot|gif|gz|ico|jpe?g|mp3|mp4|ogg|otf|pdf|png|rar|svg|tar|tgz|ttf|wav|webm|webp|woff2?|zip|7z)$/i;

const decodeSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const encodePath = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

/**
 * 把 href 的路径部分拼到当前文件目录上，`..` 逃出仓库根时返回 null。
 * 根相对路径（`/docs/x.md`）按 GitHub 语义从仓库根解析。
 */
const resolvePath = (currentPath: string, href: string): string | null => {
  const rootRelative = href.startsWith('/');
  const segments = rootRelative ? [] : currentPath.split('/').slice(0, -1);
  const raw = rootRelative ? href.slice(1) : href;

  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;

    if (part === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }

    segments.push(decodeSegment(part));
  }

  return segments.join('/');
};

/** 返回 null 表示这条链接不需要改写（锚点、外链、逃出仓库根等） */
export const rewriteRepoHref = (
  href: string,
  context: RepoLinkContext
): RepoLinkTarget | null => {
  const value = href.trim();
  if (!value || value.startsWith('#') || value.startsWith('?')) return null;
  if (isAbsoluteHref(value)) return null;

  // 站内文件页用不到 query；hash 要保留，方便跳到小节
  const hashIndex = value.indexOf('#');
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf('?');
  const hrefPath = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (!hrefPath) return null;

  const target = resolvePath(context.path, hrefPath);
  if (target === null) return null;

  const login = encodeURIComponent(context.login);
  const repo = encodeURIComponent(context.repo);
  const internal = `/${login}/repo/${repo}/${encodePath(target)}${hash}`;

  const isDirectory =
    !target || hrefPath.endsWith('/') || target.endsWith('/');
  const isAsset = !isDirectory && ASSET_EXT.test(target);

  if (isAsset) {
    return {
      href: `https://raw.githubusercontent.com/${login}/${repo}/HEAD/${encodePath(target)}${hash}`,
      external: true,
    };
  }

  // Markdown、目录以及其他未知路径都交给站内文件页：
  // 目录会渲染列表，文本会高亮，二进制会跳去 GitHub。
  return { href: internal, external: false };
};
