import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAddress, type Address } from 'viem';
import { loadConfigState } from '../../../lib/config-loader.ts';
import { loadNftConfig, NftConfigError } from '../../../lib/nft/config.ts';
import {
  checkEligibility,
  isAccountOldEnough,
} from '../../../lib/nft/eligibility.ts';
import {
  errorResponse,
  jsonResponse,
  originAllowed,
  readJson,
  readSession,
} from '../../../lib/nft/http.ts';
import { deriveClaimKey } from '../../../lib/nft/claim-key.ts';
import { buildClaimMessage } from '../../../lib/nft/message.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';
import { readStats } from '../../../lib/nft/rpc.ts';
import {
  effectiveStatus,
  getClaim,
} from '../../../lib/nft/store.ts';
import { isTheme, PER_THEME, type Theme } from '../../../lib/nft/types.ts';
import { usersKv } from '../../../lib/users-kv.ts';

export const prerender = false;

interface PrepareBody {
  theme?: unknown;
  address?: unknown;
}

export const POST: APIRoute = async ({ request, url, cookies }) => {
  const limited = await enforceNftRateLimit(request, env, 'write');
  if (limited) return limited;
  if (!originAllowed(request, url)) return errorResponse('invalid_origin', 403);

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

  const body = await readJson<PrepareBody>(request);
  if (!body || !isTheme(body.theme) || typeof body.address !== 'string') {
    return errorResponse('invalid_body', 400);
  }
  const theme: Theme = body.theme;

  let address: Address;
  try {
    address = getAddress(body.address);
  } catch {
    return errorResponse('invalid_address', 400);
  }

  const session = await readSession(cookies, url, config.sessionSecret);
  if (!session) return errorResponse('not_authenticated', 401);

  if (!isAccountOldEnough(session.createdAt, config.minAccountAgeDays)) {
    return errorResponse('account_too_new', 403);
  }

  let state;
  try {
    // prepare runs often; use the existing 5-minute cache. The voucher step
    // re-checks with `fresh: true` right before signing.
    state = await loadConfigState(session.login);
  } catch {
    return errorResponse('github_unavailable', 503);
  }
  const eligibility = checkEligibility(state, session.login);
  if (!eligibility.ok) {
    return errorResponse(
      eligibility.reason,
      eligibility.reason === 'github_unavailable' ? 503 : 403
    );
  }

  const kv = usersKv();
  if (!kv) return errorResponse('storage_unavailable', 503);

  const existing = await getClaim(kv, session.ghId, theme);
  if (existing) {
    if (effectiveStatus(existing) === 'confirmed') {
      return errorResponse('already_claimed', 409, {
        tokenId: existing.tokenId,
        serial: existing.serial,
      });
    }
    if (
      effectiveStatus(existing) === 'issued' &&
      existing.wallet.toLowerCase() !== address.toLowerCase()
    ) {
      return errorResponse('voucher_pending', 409, {
        wallet: existing.wallet,
      });
    }
  }

  try {
    const { stats } = await readStats(config);
    if (stats[theme] >= PER_THEME) return errorResponse('sold_out', 409);
  } catch {
    // The contract is the source of truth; don't block on a flaky RPC.
  }

  const claimKey = deriveClaimKey(session.ghId, theme, config.claimSalt);
  const deadline = Math.floor(Date.now() / 1000) + config.claimTtlSeconds;
  const message = buildClaimMessage({
    login: session.login,
    ghId: session.ghId,
    address,
    theme,
    claimKey,
    deadline,
  });

  return jsonResponse({
    chainId: config.chainId,
    contract: config.contractAddress,
    theme,
    address,
    claimKey,
    deadline,
    message,
  });
};
