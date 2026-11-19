import {
  BaseError,
  TransactionReceiptNotFoundError,
  createPublicClient,
  decodeEventLog,
  http,
  parseAbiItem,
  type Address,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { NFT_ABI } from './contract.ts';
import type { NftConfig } from './config.ts';
import { revertNameOf } from './error-chain.ts';
import { locateToken, type TokenLocation } from './tokens.ts';
import { isTheme, PER_THEME, type Theme } from './types.ts';

export const chainFor = (chainId: number) => {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`unsupported chain: ${chainId}`);
};

const MINTED_EVENT = parseAbiItem(
  'event Minted(address indexed to, uint8 indexed theme, uint256 indexed tokenId, uint256 serial, bytes32 claimKey)'
);

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
}export const findMintedEvent = (
  config: NftConfig,
  receipt: NftReceipt
): MintedEvent | null => {  for (const log of receipt.logs) {
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

/** Recover a relayed/self-paid mint's tx hash when only the claimKey is known. */
export const findMintByClaimKey = async (
  config: NftConfig,
  to: Address,
  theme: Theme,
  claimKey: Hex
): Promise<Hex | null> => {
  const client = nftPublicClient(config);
  const latest = await client.getBlockNumber();
  // The public Base RPC caps `eth_getLogs` at 200 blocks, so scan in chunks.
  // Base blocks are ~200ms on both mainnet and Sepolia, so 6000 blocks is
  // about 20 minutes: longer than the 15-minute voucher window.
  const scanBlocks = 6_000n;
  const chunk = 200n;
  const fromBlock = latest > scanBlocks ? latest - scanBlocks : 0n;

  for (let start = fromBlock; start <= latest; start += chunk) {
    const end = start + chunk - 1n > latest ? latest : start + chunk - 1n;
    const logs = await client.getLogs({
      address: config.contractAddress,
      event: MINTED_EVENT,
      args: { to, theme },
      fromBlock: start,
      toBlock: end,
    });

    for (const log of logs) {
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
          claimKey: Hex;
        };
        if (
          args.to.toLowerCase() === to.toLowerCase() &&
          Number(args.theme) === theme &&
          args.claimKey.toLowerCase() === claimKey.toLowerCase()
        ) {
          return log.transactionHash;
        }
      } catch {
        // Not a Minted log; keep looking.
      }
    }
  }

  return null;
};

export interface RecentMint {
  tokenId: number;
  owner: Address;
  theme: Theme;
  serial: number;
}

/** Latest tokens by ERC721Enumerable index (newest first). */
export const readRecentMints = async (
  config: NftConfig,
  limit = 12
): Promise<{ total: number; mints: RecentMint[] }> => {
  const client = nftPublicClient(config);
  const supply = (await client.readContract({
    address: config.contractAddress,
    abi: NFT_ABI,
    functionName: 'totalSupply',
  })) as bigint;
  const total = Number(supply);
  if (total <= 0) return { total: 0, mints: [] };

  const count = Math.min(Math.max(limit, 1), total);
  const first = total - count;
  const indexes = Array.from({ length: count }, (_, i) => BigInt(first + i));

  const tokenIds = (await client.multicall({
    contracts: indexes.map((index) => ({
      address: config.contractAddress,
      abi: NFT_ABI,
      functionName: 'tokenByIndex',
      args: [index],
    })),
    allowFailure: false,
  })) as bigint[];

  const ids = tokenIds.map(Number);
  const owners = (await client.multicall({
    contracts: ids.map((tokenId) => ({
      address: config.contractAddress,
      abi: NFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })),
    allowFailure: false,
  })) as Address[];

  const mints: RecentMint[] = [];
  for (let i = ids.length - 1; i >= 0; i -= 1) {
    const location = locateToken(ids[i]);
    if (!location) continue;
    mints.push({
      tokenId: ids[i],
      owner: owners[i],
      theme: location.theme,
      serial: location.serial,
    });
  }

  return { total, mints };
};

export interface OwnerCard {
  tokenId: number;
  theme: Theme;
  serial: number;
}

/** Cards held by one wallet, capped to keep the RPC fan-out bounded. */
export const readCardsForOwner = async (
  config: NftConfig,
  owner: Address,
  limit = 50
): Promise<{ balance: number; cards: OwnerCard[]; truncated: boolean }> => {
  const client = nftPublicClient(config);
  const rawBalance = (await client.readContract({
    address: config.contractAddress,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: [owner],
  })) as bigint;
  const balance = Number(rawBalance);
  if (balance <= 0) {
    return { balance: 0, cards: [], truncated: false };
  }

  const count = Math.min(balance, Math.max(limit, 1));
  const tokenIds = (await client.multicall({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: config.contractAddress,
      abi: NFT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [owner, BigInt(i)],
    })),
    allowFailure: false,
  })) as bigint[];

  const cards: OwnerCard[] = [];
  for (const raw of tokenIds) {
    const tokenId = Number(raw);
    const location = locateToken(tokenId);
    if (!location) continue;
    cards.push({
      tokenId,
      theme: location.theme,
      serial: location.serial,
    });
  }

  return { balance, cards, truncated: balance > count };
};

/** One token for the public share page; null means it does not exist. */
export const readToken = async (
  config: NftConfig,
  tokenId: number
): Promise<{ owner: Address; location: TokenLocation } | null> => {
  const location = locateToken(tokenId);
  if (!location) return null;

  try {
    const owner = (await nftPublicClient(config).readContract({
      address: config.contractAddress,
      abi: NFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })) as Address;
    return { owner, location };
  } catch (error) {
    // Only a decoded ERC721NonexistentToken revert means the token does not
    // exist. `-32603` / transport failures also surface as contract-call
    // errors, so they must not be turned into a 404.
    if (revertNameOf(error) === 'ERC721NonexistentToken') return null;
    throw error;
  }
};
