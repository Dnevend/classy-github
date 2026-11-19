/**
 * 全站安全响应头。
 *
 * 放在 Worker 入口统一加，覆盖 HTML、API、重定向和错误响应；静态资源
 * 由 Assets 直接返回，另有 `public/_headers` 兜底。
 *
 * CSP 只放不会破坏现有内联脚本的一条最小策略：
 * - `frame-ancestors 'self'` 允许 setup 页的同源 iframe 预览；
 * - `object-src 'none'` / `base-uri 'self'` 收紧插件和 base 注入面。
 */
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['x-frame-options', 'SAMEORIGIN'],
  ['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
  [
    'content-security-policy',
    "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  ],
];

const applyHeaders = (headers: Headers) => {
  for (const [name, value] of SECURITY_HEADERS) {
    if (!headers.has(name)) headers.set(name, value);
  }
};

/** 优先原地改 headers，保留 Set-Cookie 等多值头；不可变时再克隆。 */
export const withSecurityHeaders = (response: Response): Response => {
  try {
    applyHeaders(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    applyHeaders(headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
};
