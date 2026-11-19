import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAddress, type Address } from 'viem';
import { cacheGet, cachePut } from '../../../lib/edge-cache.ts';
import { loadNftConfig, NftConfigError } from '../../../lib/nft/config.ts';
import { errorResponse, jsonResponse } from '../../../lib/nft/http.ts';
import { enforceNftRateLimit } from '../../../lib/nft/rate-limit.ts';
import { readCardsForOwner } from '../../../lib/nft/rpc.ts';

export const prerender = false;

const LIMIT = 50;

export const GET: APIRoute = async ({ request, url }) => {
  const limited = await enforceNftRateLimit(request, env);
  if (limited) return limited;

  const rawAddress = url.searchParams.get('address');
  if (!rawAddress) return errorResponse('invalid_address', 400);

  let address: Address;
  try {
    address = getAddress(rawAddress);
  } catch {
    return errorResponse('invalid_address', 400);
  }

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

  const cacheKey = new Request(
    `${url.origin}/__nft_cards?chain=${config.chainId}&contract=${config.contractAddress.toLowerCase()}&address=${address.toLowerCase()}`
  );
  const cached = await cacheGet(cacheKey, 60);
  if (cached) return cached;

  try {
    const data = await readCardsForOwner(config, address, LIMIT);
    const response = jsonResponse(
      {
        chainId: config.chainId,
        contract: config.contractAddress,
        address,
        ...data,
      },
      200,
      'public, s-maxage=60'
    );
    await cachePut(cacheKey, response.clone(), 60).catch(() => undefined);
    return response;
  } catch (error) {
    console.warn(
      '[classy nft] owner cards failed:',
      error instanceof Error ? error.message : error
    );
    return errorResponse('rpc_unavailable', 503);
  }
};
