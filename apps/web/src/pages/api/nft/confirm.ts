import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Hex } from 'viem';
import { loadNftConfig, NftConfigError } from '../../../lib/nft/config.ts';
import {
  errorResponse,
  jsonResponse,
  originAllowed,
  readJson,
  readSession,
} from '../../../lib/nft/http.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';
import { findMintedEvent, getReceipt } from '../../../lib/nft/rpc.ts';
import { getClaim, putClaim } from '../../../lib/nft/store.ts';
import { usersKv } from '../../../lib/users-kv.ts';

export const prerender = false;

interface ConfirmBody {
  txHash?: unknown;
}

export const POST: APIRoute = async ({ request, url, cookies }) => {
  const limited = await enforceNftRateLimit(request, env);
  if (limited) return limited;
  if (!originAllowed(request, url)) return errorResponse('invalid_origin', 403);

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
  if (!session) return errorResponse('not_authenticated', 401);

  const body = await readJson<ConfirmBody>(request);
  if (
    !body ||
    typeof body.txHash !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(body.txHash)
  ) {
    return errorResponse('invalid_body', 400);
  }
  const txHash = body.txHash as Hex;

  const receipt = await getReceipt(config, txHash);
  if (!receipt) return errorResponse('tx_not_found', 404);
  if (receipt.status !== 'success') {
    return errorResponse('tx_reverted', 400);
  }

  const event = findMintedEvent(config, receipt);
  if (!event) return errorResponse('mint_event_not_found', 400);

  const kv = usersKv();
  if (!kv) return errorResponse('storage_unavailable', 503);

  const record = await getClaim(kv, session.ghId, event.theme);
  if (!record || record.claimKey.toLowerCase() !== event.claimKey.toLowerCase()) {
    return errorResponse('claim_not_found', 400);
  }
  if (record.wallet.toLowerCase() !== event.to.toLowerCase()) {
    return errorResponse('wallet_mismatch', 400);
  }

  if (record.status === 'confirmed') {
    return jsonResponse({
      ok: true,
      theme: record.theme,
      tokenId: record.tokenId,
      serial: record.serial,
      txHash: record.txHash,
    });
  }

  await putClaim(kv, {
    ...record,
    status: 'confirmed',
    tokenId: event.tokenId,
    serial: event.serial,
    txHash,
    confirmedAt: Date.now(),
  });

  return jsonResponse({
    ok: true,
    theme: event.theme,
    tokenId: event.tokenId,
    serial: event.serial,
    txHash,
  });
};
