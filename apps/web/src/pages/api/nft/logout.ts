import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  errorResponse,
  jsonResponse,
  originAllowed,
} from '../../../lib/nft/http.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';
import {
  isSecureUrl,
  sessionCookieName,
} from '../../../lib/nft/session.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, cookies }) => {
  const limited = await enforceNftRateLimit(request, env);
  if (limited) return limited;
  if (!originAllowed(request, url)) return errorResponse('invalid_origin', 403);

  cookies.delete(sessionCookieName(isSecureUrl(url)), { path: '/' });
  return jsonResponse({ ok: true });
};
