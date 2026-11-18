import {
  BASE_RPC_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  NFT_CHAIN_ID,
  NFT_CLAIM_SALT,
  NFT_CONTRACT_ADDRESS,
  NFT_MIN_ACCOUNT_AGE_DAYS,
  NFT_SESSION_SECRET,
  NFT_SIGNER_ADDRESS,
  NFT_SIGNER_PRIVATE_KEY,
  RELAYER_PRIVATE_KEY,
} from 'astro:env/server';
import { getAddress, type Address, type Hex } from 'viem';

export class NftConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`missing NFT config: ${missing.join(', ')}`);
    this.name = 'NftConfigError';
    this.missing = missing;
  }
}

export interface NftConfig {
  chainId: number;
  contractAddress: Address;
  rpcUrl: string;
  claimSalt: Hex;
  signerPrivateKey: Hex;
  signerAddress?: Address;
  relayerPrivateKey?: Hex;
  sessionSecret: string;
  oauthClientId: string;
  oauthClientSecret: string;
  minAccountAgeDays: number;
  claimTtlSeconds: number;
  oauthStateTtlSeconds: number;
}

const PRIVATE_KEY = /^0x[0-9a-fA-F]{64}$/;

/** Accept both `abc...` and `0xabc...` for the salt. */
const normalizeBytes32 = (value: string | undefined): Hex | null => {
  if (!value) return null;
  const hex = value.startsWith('0x') ? value : `0x${value}`;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as Hex) : null;
};

export const loadNftConfig = (): NftConfig => {
  const missing: string[] = [];
  const required = {
    GITHUB_OAUTH_CLIENT_ID,
    GITHUB_OAUTH_CLIENT_SECRET,
    NFT_SESSION_SECRET,
    NFT_SIGNER_PRIVATE_KEY,
    NFT_CLAIM_SALT,
    NFT_CONTRACT_ADDRESS,
    BASE_RPC_URL,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) missing.push(key);
  }
  if (missing.length > 0) throw new NftConfigError(missing);

  let contractAddress: Address;
  try {
    contractAddress = getAddress(NFT_CONTRACT_ADDRESS as string);
  } catch {
    throw new NftConfigError(['NFT_CONTRACT_ADDRESS']);
  }

  if (!PRIVATE_KEY.test(NFT_SIGNER_PRIVATE_KEY as string)) {
    throw new NftConfigError(['NFT_SIGNER_PRIVATE_KEY']);
  }
  const claimSalt = normalizeBytes32(NFT_CLAIM_SALT);
  if (!claimSalt) {
    throw new NftConfigError(['NFT_CLAIM_SALT']);
  }

  const chainId = Number(NFT_CHAIN_ID || 84532);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new NftConfigError(['NFT_CHAIN_ID']);
  }

  const minAccountAgeDays = Number(NFT_MIN_ACCOUNT_AGE_DAYS || 90);
  if (!Number.isFinite(minAccountAgeDays) || minAccountAgeDays <= 0) {
    throw new NftConfigError(['NFT_MIN_ACCOUNT_AGE_DAYS']);
  }

  let signerAddress: Address | undefined;
  if (NFT_SIGNER_ADDRESS) {
    try {
      signerAddress = getAddress(NFT_SIGNER_ADDRESS);
    } catch {
      throw new NftConfigError(['NFT_SIGNER_ADDRESS']);
    }
  }

  let relayerPrivateKey: Hex | undefined;
  if (RELAYER_PRIVATE_KEY) {
    if (!PRIVATE_KEY.test(RELAYER_PRIVATE_KEY)) {
      throw new NftConfigError(['RELAYER_PRIVATE_KEY']);
    }
    relayerPrivateKey = RELAYER_PRIVATE_KEY as Hex;
  }

  return {
    chainId,
    contractAddress,
    rpcUrl: BASE_RPC_URL as string,
    claimSalt,
    signerPrivateKey: NFT_SIGNER_PRIVATE_KEY as Hex,
    signerAddress,
    relayerPrivateKey,
    sessionSecret: NFT_SESSION_SECRET as string,
    oauthClientId: GITHUB_OAUTH_CLIENT_ID as string,
    oauthClientSecret: GITHUB_OAUTH_CLIENT_SECRET as string,
    minAccountAgeDays,
    claimTtlSeconds: 15 * 60,
    oauthStateTtlSeconds: 10 * 60,
  };
};
