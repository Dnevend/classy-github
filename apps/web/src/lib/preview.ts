/**
 * `?preview=1` 会绕过 HTML / 配置缓存，必须是「从本站导航过来」才生效。
 *
 * 直接访问、外部链接、爬虫带上的 preview 参数一律按普通请求处理，
 * 避免它变成免费的 cache miss 和 GitHub 配额放大器。
 *
 * 注意 Pages 代理会把请求转发到 workers.dev，`url.origin` 不是访客看到的
 * 域名，所以调用方要传 `siteOrigin(url)` 作为公开 origin。
 */
export const isPreviewRequest = (
  request: Request,
  url: URL,
  publicOrigin: string = url.origin
): boolean => {
  if (url.searchParams.get('preview') !== '1') return false;

  // 现代浏览器会直接告诉我们是同源导航；这条不依赖代理后的 URL。
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true;

  const referer = request.headers.get('referer');
  if (!referer) return false;

  try {
    return new URL(referer).origin === publicOrigin.replace(/\/+$/, '');
  } catch {
    return false;
  }
};
