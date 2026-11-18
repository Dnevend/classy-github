import {
  BaseError,
  TransactionReceiptNotFoundError,
  createPublicClient,
  decodeEventLog,
  http,
  type Address,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { NFT_ABI } from './contract.ts';
import type { NftConfig } from './config.ts';
import { isTheme, PER_THEME, type Theme } from './types.ts';

export const chainFor = (chainId: number) => {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`unsupported chain: ${chainId}`);
};

export const nftPublicClient = (config: NftConfig) =>
  createPublicClient({
    chain: chainFor(config.chainId),
    transport: http(config.rpcUrl, { timeout: 5_000 }),
  });

export type NftReceipt = Awaited<
  ReturnType<ReturnType<typeof nftPublicClient>['getTransactionReceipt']>
>;

export interface NftStats {
  stats: number[];
  remaining: number[];
  total: number;
}

export const readStats = async (config: NftConfig): Promise<NftStats> => {
  const client = nftPublicClient(config);
  const raw = (await client.readContract({
    address: config.contractAddress,
    abi: NFT_ABI,
    functionName: 'getStats',
  })) as readonly bigint[];

  const stats = raw.map(Number);
  return {
    stats,
    remaining: stats.map((minted) => PER_THEME - minted),
    total: stats.reduce((sum, minted) => sum + minted, 0),
  };
};

/**
 * Off-chain ownership check only: the contract verifies the server signer over
 * the EIP-712 voucher, not this user signature. EIP-1271 recipients are fine
 * as long as `_safeMint` can call `onERC721Received`.
 */
export const verifyWalletSignature = async (
  config: NftConfig,
  address: Address,
  message: string,
  signature: Hex
): Promise<boolean> => {
  try {
    return await nftPublicClient(config).verifyMessage({
      address,
      message,
      signature,
    });
  } catch {
    return false;
  }
};

export const getReceipt = async (
  config: NftConfig,
  hash: Hex
): Promise<NftReceipt | null> => {
  try {
    return await nftPublicClient(config).getTransactionReceipt({ hash });
  } catch (error) {
    // Only "not found" means 404; RPC errors must not look like a missing tx.
    if (error instanceof TransactionReceiptNotFoundError) return null;
    if (
      error instanceof BaseError &&
      error.walk((cause) => cause instanceof TransactionReceiptNotFoundError)
    ) {
      return null;
    }
    throw error;
  }
};

export interface MintedEvent {
  to: Address;
  theme: Theme;
  tokenId: number;
  serial: number;
  claimKey: Hex;
}

export const findMintedEvent = (
  config: NftConfig,
  receipt: NftReceipt
): MintedEvent | null => {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== config.contractAddress.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: NFT_ABI,
        eventName: 'Minted',
        data: log.data,
        topics: log.topics,
      });
      const args = decoded.args as {
        to: Address;
        theme: number;
        tokenId: bigint;
        serial: bigint;
        claimKey: Hex;
      };
      const theme = Number(args.theme);
      if (!isTheme(theme)) return null;

      return {
        to: args.to,
        theme,
        tokenId: Number(args.tokenId),
        serial: Number(args.serial),
        claimKey: args.claimKey,
      };
    } catch {
      // Not a Minted log; keep looking.
    }
  }

  return null;
};
