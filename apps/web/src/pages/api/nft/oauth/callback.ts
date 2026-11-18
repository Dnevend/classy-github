import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadNftConfig, NftConfigError } from '../../../../lib/nft/config.ts';
import {
  cookieOptions,
  createSession,
  isSecureUrl,
  oauthCookieName,
  SESSION_TTL_SECONDS,
  sessionCookieName,
  verifyOAuthState,
} from '../../../../lib/nft/session.ts';
import { exchangeCode, fetchGitHubUser } from '../../../../lib/nft/oauth.ts';
import {
  checkEligibility,
  isAccountOldEnough,
} from '../../../../lib/nft/eligibility.ts';
import { loadConfigState } from '../../../../lib/config-loader.ts';
import { enforceNftRateLimit } from '../../../../lib/nft/rate-limit.ts';
import { errorResponse } from '../../../../lib/nft/http.ts';
import { siteOrigin } from '../../../../lib/site.ts';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
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

  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return redirect(`/nft?error=oauth_${encodeURIComponent(oauthError)}`, 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return errorResponse('missing_code_or_state', 400);
  }

  const secure = isSecureUrl(url);
  const stateCookieName = oauthCookieName(secure);
  const stateCookie = cookies.get(stateCookieName)?.value;
  cookies.delete(stateCookieName, { path: '/' });

  if (
    !stateCookie ||
    !(await verifyOAuthState(stateCookie, state, config.sessionSecret))
  ) {
    return errorResponse('invalid_state', 400);
  }

  try {
    const token = await exchangeCode({
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      code,
      redirectUri: `${siteOrigin(url)}/api/nft/oauth/callback`,
    });
    const user = await fetchGitHubUser(token);

    if (!isAccountOldEnough(user.created_at, config.minAccountAgeDays)) {
      return redirect('/nft?error=account_too_new', 302);
    }

    const configState = await loadConfigState(user.login, { fresh: true });
    const eligibility = checkEligibility(configState, user.login);
    if (!eligibility.ok) {
      return redirect(`/nft?error=${eligibility.reason}`, 302);
    }

    const session = await createSession(
      { ghId: user.id, login: user.login, createdAt: user.created_at },
      config.sessionSecret,
      SESSION_TTL_SECONDS
    );
    cookies.set(
      sessionCookieName(secure),
      session,
      cookieOptions(url, SESSION_TTL_SECONDS)
    );

    return redirect('/nft/claim', 302);
  } catch (error) {
    console.warn(
      '[classy nft] oauth callback failed:',
      error instanceof Error ? error.message : error
    );
    return redirect('/nft?error=oauth_failed', 302);
  }
};
