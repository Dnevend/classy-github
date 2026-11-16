import { handle } from '@astrojs/cloudflare/handler';
import { DurableObject } from 'cloudflare:workers';

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
    return handle(request, env as never, ctx as never);
  },
};
