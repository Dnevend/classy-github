import { handle } from '@astrojs/cloudflare/handler';
import { DurableObject } from 'cloudflare:workers';
import { isAiBot } from './lib/ai-bots.ts';
import { enforceRateLimits } from './lib/rate-limit.ts';

export { MintRelayer } from './lib/nft/relayer.ts';

/**
 * 每个用户一个 Durable Object，做原子计数。
 *
 * DO 的 input gate 会保证 read-modify-write 不会被并发请求打断，
 * 这是 KV 做不到的：KV 的 `get` + `put` 在并发下会丢计数。
 */
export class HitCounter extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const readOnly = url.searchParams.get('mode') === 'read';
    const current = (await this.ctx.storage.get<number>('count')) ?? 0;

    if (readOnly) return Response.json({ count: current });

    const next = current + 1;
    await this.ctx.storage.put('count', next);
    return Response.json({ count: next });
  }
}

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: unknown) {
    const url = new URL(request.url);

    // robots.txt 必须让 bot 读到，否则它不知道要停；其余请求直接 403。
    // UA 声明只是礼貌，这里才是真正的执行。
    if (
      url.pathname !== '/robots.txt' &&
      isAiBot(request.headers.get('user-agent'))
    ) {
      return new Response('AI crawlers are not allowed', {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
        },
      });
    }

    const limited = await enforceRateLimits(request, env);
    if (limited) return limited;

    return handle(request, env as never, ctx as never);
  },
};
