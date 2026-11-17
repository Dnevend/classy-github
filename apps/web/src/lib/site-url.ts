/**
 * 把指向本站的绝对 URL 收缩成根相对路径。
 *
 * 站点同时有 `classygit.dev`、`classygit.pages.dev`、workers.dev 和本地
 * localhost 几个入口。分享卡里的封面图带 `crossorigin="anonymous"`，如果
 * 配置里写的是另一个入口的绝对地址，浏览器会按跨域处理；静态资源没有
 * `Access-Control-Allow-Origin`，图片会直接加载失败。转成 `/images/...`
 * 后无论从哪个入口访问都是同源。
 *
 * 只处理两类输入：
 * - `/...`（站内根路径）：原样返回；
 * - `http(s)://...` 且 origin 与 `origin` 相同：返回 path + query + hash。
 *
 * 外链、协议相对地址（`//host/...`）和非法值原样返回。
 */
export const sameOriginPath = (
  value: string | null | undefined,
  origin: string
): string | null | undefined => {
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const target = new URL(value);
    if (target.origin !== new URL(origin).origin) return value;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return value;
  }
};
