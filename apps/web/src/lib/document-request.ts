/**
 * 判断一次请求是不是「顶层 HTML 文档导航」。
 *
 * 只有这种请求才允许写访客偏好 cookie（主题 / 语言）。图片、JSON、RSS、
 * fetch 等子资源即使带 `?theme=` / `?lang=`，也只用于本次渲染，不能覆盖
 * 访客已经保存的选择。
 *
 * 背景：README 里的 `/badge/<user>.svg?theme=mac|win98|tui` 会在页面加载时
 * 并发请求；中间件曾把每个 `?theme=` 都写进 `classy_theme`，最后一个返回的
 * 徽章决定主题，刷新时主题就会在几套皮肤之间跳。
 */

/** 这些前缀返回的不是 HTML 文档，直接排除 */
const NON_DOCUMENT_PREFIX =
  /^\/(?:api|og|card|contrib|sitemap|robots\.txt|cursors|fonts|images)(?:\/|$)/i;

/** RSS 是订阅入口，浏览器 / 阅读器导航也不应该改主题偏好 */
const FEED_PATH = /\/rss\.xml\/?$/i;

/** 徽章 SVG 是图片，哪怕用户直接打开也不应该写主题 cookie */
const BADGE_SVG = /^\/badge\/[^/]+\.svg$/i;

export interface DocumentNavigation {
  method: string;
  pathname: string;
  /**
   * `Sec-Fetch-Dest`：浏览器顶层导航是 `document`，图片是 `image`，
   * fetch / XHR 是 `empty`。没有这个头的老客户端走 Accept 兜底。
   */
  destination?: string | null;
  /** 没有 `Sec-Fetch-Dest` 时用 Accept 判断是不是 HTML */
  accept?: string | null;
  /** 预取 / 预渲染也不是用户的显式选择，不能写偏好 */
  purpose?: string | null;
}

export const isDocumentNavigation = ({
  method,
  pathname,
  destination,
  accept,
  purpose,
}: DocumentNavigation): boolean => {
  if (method !== 'GET') return false;
  if (NON_DOCUMENT_PREFIX.test(pathname)) return false;
  if (FEED_PATH.test(pathname)) return false;
  if (BADGE_SVG.test(pathname)) return false;
  if (purpose && /(?:prefetch|prerender)/i.test(purpose)) return false;

  // 现代浏览器：信 Sec-Fetch-Dest。不要按扩展名一刀切，否则仓库文件页
  // （`/user/repo/blob/main/src/index.ts`、`pom.xml`）也会被误判成子资源，
  // 在这些页面点主题切换就存不下来了。
  if (destination) return destination === 'document';

  // curl / 老浏览器没有 Sec-Fetch-Dest：Accept 必须是 HTML。
  // curl 默认 `Accept: */*`，不会写 cookie。
  return Boolean(accept?.includes('text/html'));
};
