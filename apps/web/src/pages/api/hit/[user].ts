import type { APIRoute } from 'astro';
import type { DurableObjectNamespace } from 'cloudflare:workers';
import { env } from 'cloudflare:workers';
import { isBotRequest } from '../../../lib/hit-counter';
import { usersKv } from '../../../lib/users-kv';

export const prerender = false;

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

const hitNamespace = (): DurableObjectNamespace | undefined => {
  try {
    return (env as { HITS?: DurableObjectNamespace }).HITS;
  } catch {
    return undefined;
  }
};

/**
 * 访问计数器。
 *
 * - GET /api/hit/<user>           → 原子 +1，返回最新计数
 * - GET /api/hit/<user>?mode=read → 只读（同一会话的第二次访问、bot、预取）
 *
 * 计数存在每个用户一个的 Durable Object 里；不存 IP，只存总数。
 */
export const GET: APIRoute = async ({ params, request, url }) => {
  const user = params.user ?? '';

  if (!LOGIN.test(user)) {
    return new Response('Invalid GitHub login', { status: 400 });
  }

  const namespace = hitNamespace();
  if (!namespace) {
    return Response.json(
      { count: null, error: 'counter-unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  // 只给注册过的站点计数，避免随便一个 login 就创建 DO：
  // 计数只对已认领页面有意义。
  const kv = usersKv();
  const site = kv
    ? await kv.get(`site:${user.toLowerCase()}`).catch(() => null)
    : null;

  if (!site) {
    return Response.json(
      { count: null, skipped: 'unclaimed' },
      { headers: { 'cache-control': 'no-store' } }
    );
  }

  const readOnly =
    url.searchParams.get('mode') === 'read' || isBotRequest(request);
  const stub = namespace.get(namespace.idFromName(user.toLowerCase()));

  try {
    const response = await stub.fetch(
      `https://hit-counter/?mode=${readOnly ? 'read' : 'write'}`
    );
    const data = (await response.json()) as { count?: number };

    return Response.json(data, {
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.warn(`[classy] 计数器请求失败 (${user}):`, error);
    return Response.json(
      { count: null, error: 'counter-error' },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }
};
