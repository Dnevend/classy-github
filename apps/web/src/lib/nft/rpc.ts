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
}

export const findMintedEvent = (
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
