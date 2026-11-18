import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadNftConfig, NftConfigError } from '../../../lib/nft/config.ts';
import {
  errorResponse,
  jsonResponse,
  readSession,
} from '../../../lib/nft/http.ts';
import { effectiveStatus, listClaims } from '../../../lib/nft/store.ts';
import { usersKv } from '../../../lib/users-kv.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const limited = await enforceNftRateLimit(request, env);
  if (limited) return limited;

  let config;
  try {
    config = loadNftConfig();
  } catch (error) {
    if (error instanceof NftConfigError) {
      return errorResponse('not_configured', 503, { missing: error.missing });
    }
    throw error;
  }

  const session = await readSession(cookies, url, config.sessionSecret);
  if (!session) return jsonResponse({ authenticated: false });

  const kv = usersKv();
  const claims = kv ? await listClaims(kv, session.ghId) : [];

  return jsonResponse({
    authenticated: true,
    login: session.login,
    ghId: session.ghId,
    claims: claims.map((claim) => ({
      theme: claim.theme,
      status: effectiveStatus(claim),
      wallet: claim.wallet,
      tokenId: claim.tokenId,
      serial: claim.serial,
      txHash: claim.txHash,
    })),
  });
};
