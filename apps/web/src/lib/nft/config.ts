import {
  BASE_RPC_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  NFT_CHAIN_ID,
  NFT_CLAIM_SALT,
  NFT_CONTRACT_ADDRESS,
  NFT_MAX_FEE_GWEI,
  NFT_MIN_ACCOUNT_AGE_DAYS,
  NFT_MINT_MODE,
  NFT_RELAY_DAILY_CAP_ETH,
  NFT_RELAYER_MIN_BALANCE_ETH,
  NFT_SESSION_SECRET,
  NFT_SIGNER_ADDRESS,
  NFT_SIGNER_PRIVATE_KEY,
  RELAYER_ADDRESS,
  RELAYER_PRIVATE_KEY,
} from 'astro:env/server';
import {
  getAddress,
  parseEther,
  parseGwei,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export class NftConfigError extends Error {
  readonly missing: string[];
  readonly invalid: string[];

  constructor(missing: string[] = [], invalid: string[] = []) {
    const parts = [
      missing.length ? `missing: ${missing.join(', ')}` : '',
      invalid.length ? `invalid: ${invalid.join(', ')}` : '',
    ].filter(Boolean);
    super(`NFT config ${parts.join('; ')}`);
    this.name = 'NftConfigError';
    this.missing = missing;
    this.invalid = invalid;
  }
}

export interface NftConfig {
  chainId: number;
  contractAddress: Address;
  rpcUrl: string;
  claimSalt: Hex;
  signerPrivateKey: Hex;
  signerAddress: Address;
  relayerPrivateKey?: Hex;
  relayerAddress?: Address;
  mintMode: 'relay' | 'self';
  /** True when the server can sponsor gas and the operator enabled it. */
  gasless: boolean;
  maxFeePerGasWei: bigint;
  maxPriorityFeePerGasWei: bigint;
  relayDailyCapWei: bigint;
  relayerMinBalanceWei: bigint;
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
    NFT_SIGNER_ADDRESS,
    NFT_CLAIM_SALT,
    NFT_CONTRACT_ADDRESS,
    BASE_RPC_URL,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) missing.push(key);
  }
  if (missing.length > 0) throw new NftConfigError(missing);

  if ((NFT_SESSION_SECRET as string).length < 32) {
    throw new NftConfigError([], ['NFT_SESSION_SECRET']);
  }

  let contractAddress: Address;
  try {
    contractAddress = getAddress(NFT_CONTRACT_ADDRESS as string);
  } catch {
    throw new NftConfigError([], ['NFT_CONTRACT_ADDRESS']);
  }

  if (!PRIVATE_KEY.test(NFT_SIGNER_PRIVATE_KEY as string)) {
    throw new NftConfigError([], ['NFT_SIGNER_PRIVATE_KEY']);
  }
  const claimSalt = normalizeBytes32(NFT_CLAIM_SALT);
  if (!claimSalt) {
    throw new NftConfigError([], ['NFT_CLAIM_SALT']);
  }

  const chainId = Number(NFT_CHAIN_ID || 84532);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new NftConfigError([], ['NFT_CHAIN_ID']);
  }

  const minAccountAgeDays = Number(NFT_MIN_ACCOUNT_AGE_DAYS || 90);
  if (!Number.isFinite(minAccountAgeDays) || minAccountAgeDays <= 0) {
    throw new NftConfigError([], ['NFT_MIN_ACCOUNT_AGE_DAYS']);
  }

  let signerAddress: Address;
  try {
    signerAddress = getAddress(NFT_SIGNER_ADDRESS as string);
  } catch {
    throw new NftConfigError([], ['NFT_SIGNER_ADDRESS']);
  }

  let relayerPrivateKey: Hex | undefined;
  let relayerAddress: Address | undefined;
  if (RELAYER_PRIVATE_KEY) {
    if (!PRIVATE_KEY.test(RELAYER_PRIVATE_KEY)) {
      throw new NftConfigError([], ['RELAYER_PRIVATE_KEY']);
    }
    relayerPrivateKey = RELAYER_PRIVATE_KEY as Hex;
    relayerAddress = privateKeyToAccount(relayerPrivateKey).address;

    if (RELAYER_ADDRESS) {
      let declared: Address;
      try {
        declared = getAddress(RELAYER_ADDRESS as string);
      } catch {
        throw new NftConfigError([], ['RELAYER_ADDRESS']);
      }
      if (declared !== relayerAddress) {
        throw new NftConfigError([], ['RELAYER_ADDRESS']);
      }
    }
  }

  const mintMode = NFT_MINT_MODE || 'relay';
  if (mintMode !== 'relay' && mintMode !== 'self') {
    throw new NftConfigError([], ['NFT_MINT_MODE']);
  }

  const parseGweiCap = (
    name: string,
    value: string | undefined,
    fallback: string
  ): bigint => {
    if (!value) return parseGwei(fallback);
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1000) {
      throw new NftConfigError([], [name]);
    }
    try {
      return parseGwei(value);
    } catch {
      throw new NftConfigError([], [name]);
    }
  };

  const parseEtherCap = (
    name: string,
    value: string | undefined,
    fallback: string
  ): bigint => {
    if (!value) return parseEther(fallback);
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new NftConfigError([], [name]);
    }
    try {
      return parseEther(value);
    } catch {
      throw new NftConfigError([], [name]);
    }
  };

  const maxFeePerGasWei = parseGweiCap('NFT_MAX_FEE_GWEI', NFT_MAX_FEE_GWEI, '0.1');
  const relayDailyCapWei = parseEtherCap(
    'NFT_RELAY_DAILY_CAP_ETH',
    NFT_RELAY_DAILY_CAP_ETH,
    '0.01'
  );
  const relayerMinBalanceWei = parseEtherCap(
    'NFT_RELAYER_MIN_BALANCE_ETH',
    NFT_RELAYER_MIN_BALANCE_ETH,
    '0.001'
  );

  return {
    chainId,
    contractAddress,
    rpcUrl: BASE_RPC_URL as string,
    claimSalt,
    signerPrivateKey: NFT_SIGNER_PRIVATE_KEY as Hex,
    signerAddress,
    relayerPrivateKey,
    relayerAddress,
    mintMode,
    gasless: mintMode === 'relay' && Boolean(relayerPrivateKey),
    maxFeePerGasWei,
    maxPriorityFeePerGasWei: parseGwei('0.001'),
    relayDailyCapWei,
    relayerMinBalanceWei,
    sessionSecret: NFT_SESSION_SECRET as string,
    oauthClientId: GITHUB_OAUTH_CLIENT_ID as string,
    oauthClientSecret: GITHUB_OAUTH_CLIENT_SECRET as string,
    minAccountAgeDays,
    claimTtlSeconds: 15 * 60,
    oauthStateTtlSeconds: 10 * 60,
  };
};
