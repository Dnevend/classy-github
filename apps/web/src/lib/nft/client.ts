import {
  createWalletClient,
  custom,
  getAddress,
  type Address,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { NFT_ABI } from './contract.ts';
import type { Voucher } from './voucher.ts';

export interface InjectedProvider {
  request(args: {
    method: string;
    params?: unknown[] | object;
  }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

export const getInjectedProvider = (): InjectedProvider | null => {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
};

export const chainFor = (chainId: number) => {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`Unsupported chain: ${chainId}`);
};

export const chainName = (chainId: number): string => {
  try {
    return chainFor(chainId).name;
  } catch {
    return `Chain ${chainId}`;
  }
};

export const chainParams = (chainId: number) => {
  const chain = chainFor(chainId);
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    rpcUrls: chain.rpcUrls.default.http,
    blockExplorerUrls: chain.blockExplorers?.default?.url
      ? [chain.blockExplorers.default.url]
      : [],
    nativeCurrency: chain.nativeCurrency,
  };
};

export const readAccounts = async (
  provider: InjectedProvider
): Promise<string[]> =>
  (await provider.request({ method: 'eth_accounts' })) as string[];

export const readChainId = async (
  provider: InjectedProvider
): Promise<number> => {
  const value = await provider.request({ method: 'eth_chainId' });
  return typeof value === 'string'
    ? Number.parseInt(value, 16)
    : Number(value);
};

export const connectWallet = async (
  provider: InjectedProvider
): Promise<Address> => {
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[];
  if (!accounts[0]) throw new Error('no_account');
  return getAddress(accounts[0]);
};

/** Prompt the wallet even if it already authorized this site. */
export const changeWallet = async (
  provider: InjectedProvider
): Promise<Address> => {
  try {
    await provider.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Some wallets do not support wallet_requestPermissions.
  }
  return connectWallet(provider);
};

export const switchChain = async (
  provider: InjectedProvider,
  chainId: number
): Promise<number> => {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [chainParams(chainId)],
    });
  }
  return readChainId(provider);
};

export const signClaimMessage = async ({
  provider,
  address,
  chainId,
  message,
}: {
  provider: InjectedProvider;
  address: Address;
  chainId: number;
  message: string;
}): Promise<Hex> => {
  const client = createWalletClient({
    account: address,
    chain: chainFor(chainId),
    transport: custom(provider),
  });
  return client.signMessage({ account: address, message });
};

export const mintPass = async ({
  provider,
  address,
  chainId,
  contract,
  voucher,
  signature,
}: {
  provider: InjectedProvider;
  address: Address;
  chainId: number;
  contract: Address;
  voucher: Voucher;
  signature: Hex;
}): Promise<Hex> => {
  const client = createWalletClient({
    account: address,
    chain: chainFor(chainId),
    transport: custom(provider),
  });
  return client.writeContract({
    address: contract,
    abi: NFT_ABI,
    functionName: 'mintWithSignature',
    args: [
      voucher.to,
      voucher.theme,
      voucher.claimKey,
      BigInt(voucher.deadline),
      signature,
    ],
    account: address,
    chain: chainFor(chainId),
  });
};

/**
 * Search a viem/wallet error chain. viem's `BaseError.walk(fn)` returns the
 * first error object matched by `fn` (not a boolean), so its result must be
 * treated as a match, not a truthy predicate return.
 */
const findInErrorChain = (
  error: unknown,
  match: (value: object) => boolean
): object | null => {
  const seen = new Set<unknown>();

  const visit = (value: unknown, depth: number): object | null => {
    if (depth > 6 || !value || typeof value !== 'object' || seen.has(value)) {
      return null;
    }
    seen.add(value);
    if (match(value)) return value;

    const record = value as {
      cause?: unknown;
      walk?: (fn: (cause: unknown) => boolean) => unknown;
    };

    if (typeof record.walk === 'function') {
      try {
        const hit = record.walk((cause) =>
          Boolean(cause && typeof cause === 'object' && match(cause))
        );
        if (hit && typeof hit === 'object') return hit;
      } catch {
        // Ignore a broken walk implementation.
      }
    }

    return 'cause' in record ? visit(record.cause, depth + 1) : null;
  };

  return visit(error, 0);
};

export const isUserRejected = (error: unknown): boolean =>
  Boolean(
    findInErrorChain(
      error,
      (value) => (value as { code?: number }).code === 4001
    )
  );

/** Revert name decoded by viem from the ABI error list, if any. */
export const revertNameOf = (error: unknown): string | null => {
  const hit = findInErrorChain(error, (value) => {
    const data = (value as { data?: { errorName?: unknown } }).data;
    return typeof data?.errorName === 'string';
  });
  if (!hit) return null;
  return (hit as { data: { errorName: string } }).data.errorName;
};

export const shortAddress = (address: string): string =>
  address.length > 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

export const explorerTxUrl = (
  chainId: number,
  txHash: string
): string | null => {
  try {
    const baseUrl = chainFor(chainId).blockExplorers?.default?.url;
    return baseUrl ? `${baseUrl}/tx/${txHash}` : null;
  } catch {
    return null;
  }
};

export const explorerAddressUrl = (
  chainId: number,
  address: string
): string | null => {
  try {
    const baseUrl = chainFor(chainId).blockExplorers?.default?.url;
    return baseUrl ? `${baseUrl}/address/${address}` : null;
  } catch {
    return null;
  }
};
