import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAddress, type Address, type Hex } from 'viem';
import { loadNftConfig, NftConfigError } from '../../../lib/nft/config.ts';
import { deriveClaimKey } from '../../../lib/nft/claim-key.ts';
import {
  errorResponse,
  jsonResponse,
  originAllowed,
  readJson,
  readSession,
} from '../../../lib/nft/http.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';
import {
  relayObjectName,
  type RelayRequest,
  type RelayResult,
} from '../../../lib/nft/relayer.ts';
import {
  effectiveStatus,
  getClaim,
  putClaim,
} from '../../../lib/nft/store.ts';
import { isTheme, type Theme } from '../../../lib/nft/types.ts';
import { verifyMintVoucher } from '../../../lib/nft/voucher.ts';
import { usersKv } from '../../../lib/users-kv.ts';

export const prerender = false;

interface RelayBody {
  theme?: unknown;
  address?: unknown;
  claimKey?: unknown;
  deadline?: unknown;
  signature?: unknown;
}

interface RelayNamespace {
  idFromName(name: string): unknown;
  get(
    id: unknown
  ): {
    fetch(input: string, init?: RequestInit): Promise<Response>;
  };
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

  const body = await readJson<RelayBody>(request);
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

  if (
    typeof body.claimKey !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(body.claimKey) ||
    typeof body.deadline !== 'number' ||
    !Number.isSafeInteger(body.deadline) ||
    typeof body.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(body.signature) ||
    body.signature.length < 10
  ) {
    return errorResponse('invalid_body', 400);
  }

  const deadline = body.deadline;
  const claimKey = body.claimKey as Hex;
  const signature = body.signature as Hex;
  const now = Math.floor(Date.now() / 1000);

  if (deadline <= now || deadline > now + config.claimTtlSeconds + 60) {
    return errorResponse('invalid_deadline', 400);
  }

  const session = await readSession(cookies, url, config.sessionSecret);
  if (!session) return errorResponse('not_authenticated', 401);

  const expectedKey = deriveClaimKey(session.ghId, theme, config.claimSalt);
  if (expectedKey.toLowerCase() !== claimKey.toLowerCase()) {
    return errorResponse('claim_not_found', 400);
  }

  const kv = usersKv();
  if (!kv) return errorResponse('storage_unavailable', 503);

  const record = await getClaim(kv, session.ghId, theme);
  if (!record) return errorResponse('claim_not_found', 400);
  if (record.claimKey.toLowerCase() !== claimKey.toLowerCase()) {
    return errorResponse('claim_not_found', 400);
  }
  if (record.wallet.toLowerCase() !== address.toLowerCase()) {
    return errorResponse('wallet_mismatch', 400);
  }
  if (effectiveStatus(record) === 'confirmed') {
    return errorResponse('already_claimed', 409, {
      tokenId: record.tokenId,
      serial: record.serial,
      txHash: record.txHash,
    });
  }

  if (!config.gasless || !config.relayerPrivateKey) {
    return errorResponse('relayer_unavailable', 503, { reason: 'disabled' });
  }

  if (
    !(await verifyMintVoucher({
      signerAddress: config.signerAddress,
      chainId: config.chainId,
      verifyingContract: config.contractAddress,
      voucher: { to: address, theme, claimKey, deadline },
      signature,
    }))
  ) {
    return errorResponse('invalid_signature', 401);
  }

  const namespace = (env as Record<string, unknown>).MINT_RELAYER as
    | RelayNamespace
    | undefined;
  if (!namespace) {
    return errorResponse('relayer_unavailable', 503, { reason: 'disabled' });
  }

  const relayRequest: RelayRequest = {
    to: address,
    theme,
    claimKey,
    deadline,
    signature,
  };

  let result: RelayResult;
  try {
    const id = namespace.idFromName(relayObjectName);
    const response = await namespace.get(id).fetch('https://relayer/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(relayRequest),
    });
    result = (await response.json()) as RelayResult;
  } catch (error) {
    console.warn(
      '[classy nft] relay object failed:',
      error instanceof Error ? error.message : error
    );
    return errorResponse('relayer_unavailable', 503, { reason: 'internal' });
  }

  if (result.status === 'sent') {
    try {
      await putClaim(kv, { ...record, txHash: result.txHash });
    } catch {
      // The tx is already sent; confirm can still recover from the hash.
    }
    return jsonResponse({
      ok: true,
      gasless: true,
      txHash: result.txHash,
    });
  }

  if (result.status === 'sold_out') {
    return errorResponse('sold_out', 409);
  }

  if (result.status === 'already_claimed') {
    return errorResponse('already_claimed', 409, {
      txHash: result.txHash,
    });
  }

  return errorResponse('relayer_unavailable', 503, {
    reason: result.reason,
  });
};
