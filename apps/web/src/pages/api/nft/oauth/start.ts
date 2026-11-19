import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadNftConfig, NftConfigError } from '../../../../lib/nft/config.ts';
import {
  cookieOptions,
  createOAuthState,
  isSecureUrl,
  oauthCookieName,
} from '../../../../lib/nft/session.ts';
import { buildAuthorizeUrl } from '../../../../lib/nft/oauth.ts';
import { enforceNftRateLimit } from '../../../../lib/nft/rate-limit.ts';
import { errorResponse } from '../../../../lib/nft/http.ts';
import { siteOrigin } from '../../../../lib/site.ts';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
  const limited = await enforceNftRateLimit(request, env, 'write');
  if (limited) return limited;

  let config;
  try {
    config = loadNftConfig();
  } catch (error) {
    if (error instanceof NftConfigError) {
      return errorResponse('not_configured', 503, {
        missing: error.missing,
        invalid: error.invalid,
      });
    }
    throw error;
  }

  const { state, cookieValue } = await createOAuthState(
    config.sessionSecret,
    config.oauthStateTtlSeconds
  );
  const secure = isSecureUrl(url);

  cookies.set(
    oauthCookieName(secure),
    cookieValue,
    cookieOptions(url, config.oauthStateTtlSeconds)
  );

  const redirectUri = `${siteOrigin(url)}/api/nft/oauth/callback`;
  const response = redirect(
    buildAuthorizeUrl({
      clientId: config.oauthClientId,
      redirectUri,
      state,
    }),
    302
  );
  response.headers.set('cache-control', 'no-store');
  return response;
};
