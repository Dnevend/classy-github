const BOT =
  /bot|crawl|spider|preview|slurp|bing|yandex|facebook|twitter|slack|discord|telegram|whatsapp|headless|lighthouse/i;

/**
 * 访问计数的 bot / 预取过滤。
 * 纯函数，方便在 node 里断言；真实流量里 UA 只能挡住大部分，计数本来就是近似的。
 */
export const isBotRequest = (request: Request): boolean => {
  const ua = request.headers.get('user-agent') ?? '';
  const purpose = [
    request.headers.get('sec-purpose'),
    request.headers.get('purpose'),
  ]
    .filter(Boolean)
    .join(' ');

  return BOT.test(ua) || /prefetch|prerender/i.test(purpose);
};
