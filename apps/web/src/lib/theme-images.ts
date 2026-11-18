import type { Element, ElementContent, Properties, Root, RootContent } from 'hast';

export type ColorScheme = 'light' | 'dark';

export interface ThemeImagesOptions {
  /** 当前主题的亮/暗；决定保留哪一版 GitHub 主题变体图片 */
  colorScheme?: ColorScheme;
}

/**
 * GitHub 的主题变体图片约定：
 *
 *   <img src="light.svg#gh-light-mode-only">
 *   <img src="dark.svg#gh-dark-mode-only">
 *   <picture>
 *     <source media="(prefers-color-scheme: dark)" srcset="dark.svg">
 *     <img src="fallback.png">
 *   </picture>
 *
 * GitHub 靠自己的深浅色外观挑选；本站背景由主题决定（mac/win98 白底、
 * nes/tui 深底），跟随访客系统的 prefers-color-scheme 会把深色图塞进白底页面。
 * 所以这里在服务端按主题的 color-scheme 直接挑一版，丢掉另一版：
 * 浏览器只下载真正显示的那张图，也不需要前端脚本。
 *
 * 插件必须跑在 sanitize 之后（节点已可信、属性已白名单），
 * 并跑在 rehypeFixUrls 之前——`<picture>` 折叠成 `<img>` 后，
 * 相对 srcset 才能按现有逻辑补成绝对地址。
 */
const MODE_FRAGMENTS: Record<ColorScheme, string> = {
  light: '#gh-light-mode-only',
  dark: '#gh-dark-mode-only',
};

const SCHEME_MEDIA = /\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/i;

const PICTURE_ATTRS = ['alt', 'title', 'width', 'height', 'align', 'className'] as const;

/**
 * `srcset` 不受 rehype-sanitize 的协议白名单保护（它只校验 `src`），
 * 折叠成 `<img src>` 前自己挡一次 javascript:/vbscript:/file:。
 */
const SAFE_IMAGE_URL =
  /^(?:https?:|data:image\/|blob:|\/|#|\.{0,2}\/|[^:]*$)/i;

const isSafeImageUrl = (value: string) => SAFE_IMAGE_URL.test(value);

interface ModeUrl {
  url: string;
  scheme: ColorScheme;
}

const parseModeUrl = (value: unknown): ModeUrl | null => {
  if (typeof value !== 'string') return null;

  for (const scheme of ['light', 'dark'] as const) {
    const fragment = MODE_FRAGMENTS[scheme];
    if (value.endsWith(fragment)) {
      return { url: value.slice(0, -fragment.length), scheme };
    }
  }

  return null;
};

const readSrcSet = (props: Properties): string | null => {
  const value = props.srcSet ?? props.srcset;
  return typeof value === 'string' ? value : null;
};

/** 取 srcset 的第一个候选 URL；主题变体图片通常只有一个候选 */
const firstSrcSetUrl = (value: string): string | null => {
  const first = /^\s*(\S+)/.exec(value);
  return first ? first[1] : null;
};

/**
 * 返回 false 表示这张图属于另一种配色，应整个删掉。
 *
 * `<img>` 的 `srcset` 不在 rehype-sanitize 的白名单里（只有 `<source>` 放开），
 * 走到这里时已经被清掉，所以只需要处理 `src`。
 */
const normalizeImage = (img: Element, scheme: ColorScheme): boolean => {
  const props = img.properties ?? (img.properties = {});
  const src = parseModeUrl(props.src);

  if (!src) return true;
  if (src.scheme !== scheme) return false;

  props.src = src.url;
  return true;
};

const schemeFromMedia = (media: unknown): ColorScheme | null => {
  if (typeof media !== 'string') return null;

  const match = SCHEME_MEDIA.exec(media);
  return match ? (match[1].toLowerCase() as ColorScheme) : null;
};

type PictureResolution =
  | { kind: 'unchanged' }
  | { kind: 'replace'; img: Element }
  | { kind: 'remove' };

/**
 * 把 `<picture>` 折叠成一张 `<img>`。不含 color-scheme 条件的 picture
 * （纯响应式）原样保留，交给浏览器。
 */
const resolvePicture = (picture: Element, scheme: ColorScheme): PictureResolution => {
  const sources = picture.children.filter(
    (child): child is Element => child.type === 'element' && child.tagName === 'source'
  );
  const fallback = picture.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'img'
  );

  if (!sources.some((source) => schemeFromMedia(source.properties?.media))) {
    return { kind: 'unchanged' };
  }

  const picked = sources.find(
    (source) => schemeFromMedia(source.properties?.media) === scheme
  );

  const sourceUrlCandidate = picked
    ? firstSrcSetUrl(readSrcSet(picked.properties ?? {}) ?? '') ??
      (typeof picked.properties?.src === 'string' ? picked.properties.src : null)
    : null;

  const fallbackUrlCandidate =
    typeof fallback?.properties?.src === 'string' ? fallback.properties.src : null;

  const sourceUrl =
    sourceUrlCandidate && isSafeImageUrl(sourceUrlCandidate) ? sourceUrlCandidate : null;
  const fallbackUrl =
    fallbackUrlCandidate && isSafeImageUrl(fallbackUrlCandidate)
      ? fallbackUrlCandidate
      : null;

  const src = sourceUrl ?? fallbackUrl;
  if (!src) return { kind: 'remove' };

  const properties: Properties = { src };

  if (fallback) {
    for (const key of PICTURE_ATTRS) {
      const value = fallback.properties?.[key];
      if (value !== undefined) {
        properties[key] = value;
      }
    }
  }

  return {
    kind: 'replace',
    img: { type: 'element', tagName: 'img', properties, children: [] },
  };
};

const isBlank = (node: RootContent | ElementContent): boolean => {
  if (node.type === 'text') return node.value.trim() === '';
  if (node.type === 'comment') return true;
  return false;
};

/** 图片被删掉后，只含空白/注释的 <p>、<a> 一并清理，避免留下空行 */
const isCollapsibleWrapper = (node: Element) =>
  node.tagName === 'p' || node.tagName === 'a';

const prune = (parent: Root | Element, scheme: ColorScheme): boolean => {
  let removed = false;
  const children = parent.children as Array<RootContent | ElementContent>;

  // 倒序遍历：删除/替换节点不会影响尚未访问的下标
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children[index];
    if (child.type !== 'element') continue;

    if (child.tagName === 'picture') {
      const resolution = resolvePicture(child, scheme);

      if (resolution.kind === 'unchanged') {
        // 纯响应式 picture 本身交给浏览器，但里面的兜底 <img> 仍可能带主题片段
        if (prune(child, scheme)) {
          removed = true;

          if (!child.children.some((node) => node.type === 'element' && node.tagName === 'img')) {
            children.splice(index, 1);
          }
        }
        continue;
      }

      removed = true;

      if (resolution.kind === 'remove') {
        children.splice(index, 1);
        continue;
      }

      children[index] = resolution.img;
      // 匹配的 source 自己也可能带 #gh-* 片段
      if (!normalizeImage(resolution.img, scheme)) {
        children.splice(index, 1);
      }
      continue;
    }

    if (child.tagName === 'img') {
      if (!normalizeImage(child, scheme)) {
        children.splice(index, 1);
        removed = true;
      }
      continue;
    }

    if (prune(child, scheme)) {
      removed = true;

      if (isCollapsibleWrapper(child) && child.children.every(isBlank)) {
        children.splice(index, 1);
      }
    }
  }

  return removed;
};

export const rehypeThemeImages =
  (options: ThemeImagesOptions = {}) =>
  (tree: Root): void => {
    prune(tree, options.colorScheme ?? 'light');
  };
