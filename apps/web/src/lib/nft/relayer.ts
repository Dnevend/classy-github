import { DurableObject } from 'cloudflare:workers';
import {
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadNftConfig } from './config.ts';
import { NFT_ABI } from './contract.ts';
import { revertNameOf } from './error-chain.ts';
import { chainFor, nftPublicClient } from './rpc.ts';
import { isTheme, type Theme } from './types.ts';

export interface RelayRequest {
  to: Address;
  theme: Theme;
  claimKey: Hex;
  /** Unix seconds */
  deadline: number;
  signature: Hex;
}

export type RelayResult =
  | { status: 'sent'; txHash: Hex }
  | { status: 'already_claimed'; txHash?: Hex }
  | { status: 'sold_out' }
  | {
      status: 'unavailable';
      reason: 'disabled' | 'balance' | 'budget' | 'gas_cap';
    }
  | { status: 'retry_later'; reason: string };

interface RelayRecord {
  status: 'sending' | 'sent' | 'failed';
  txHash: Hex;
  raw: Hex;
  nonce: number;
  updatedAt: number;
}

const RELAY_OBJECT_NAME = 'mint-relayer';
const GAS_LIMIT_MULTIPLIER = 12n;
const GAS_LIMIT_DIVISOR = 10n;

const allowed = (request: RelayRequest): boolean =>
  /^0x[0-9a-fA-F]{40}$/.test(request.to) &&
  /^0x[0-9a-fA-F]{64}$/.test(request.claimKey) &&
  /^0x[0-9a-fA-F]+$/.test(request.signature) &&
  isTheme(request.theme) &&
  Number.isSafeInteger(request.deadline) &&
  request.deadline > 0;

/**
 * Singleton Durable Object that serialises relayed mints: one nonce, one
 * in-flight transaction, idempotent by claimKey.
 */
export class MintRelayer extends DurableObject {
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json(await this.health());
    }
    if (request.method !== 'POST' || url.pathname !== '/submit') {
      return new Response('Not found', { status: 404 });
    }

    let body: RelayRequest;
    try {
      body = (await request.json()) as RelayRequest;
    } catch {
      return Response.json(
        { status: 'retry_later', reason: 'invalid_body' },
        { status: 400 }
      );
    }
    if (!allowed(body)) {
      return Response.json(
        { status: 'retry_later', reason: 'invalid_body' },
        { status: 400 }
      );
    }

    try {
      return Response.json(await this.enqueue(() => this.submit(body)));
    } catch (error) {
      console.error(
        '[classy nft] relay failed:',
        error instanceof Error ? error.message : error
      );
      return Response.json({ status: 'retry_later', reason: 'internal' });
    }
  }

  private async health(): Promise<Record<string, unknown>> {
    try {
      const config = loadNftConfig();
      if (!config.gasless || !config.relayerAddress) {
        return { gasless: false };
      }
      const balance = await nftPublicClient(config).getBalance({
        address: config.relayerAddress,
      });
      return {
        gasless: true,
        balanceWei: balance.toString(),
        low: balance < config.relayerMinBalanceWei,
      };
    } catch (error) {
      return {
        gasless: false,
        error: error instanceof Error ? error.message : 'unknown',
      };
    }
  }

  private async submit(request: RelayRequest): Promise<RelayResult> {
    const config = loadNftConfig();
    if (
      config.mintMode !== 'relay' ||
      !config.relayerPrivateKey ||
      !config.relayerAddress
    ) {
      return { status: 'unavailable', reason: 'disabled' };
    }

    const publicClient = nftPublicClient(config);
    const key = `relay:${request.claimKey.toLowerCase()}`;
    const record = await this.ctx.storage.get<RelayRecord>(key);

    // Idempotency: a previous attempt already produced a hash. Re-broadcast
    // the raw tx if it never landed, otherwise hand the same hash back.
    if (record) {
      const settled = await this.hasSettled(publicClient, record.txHash);
      if (settled) return { status: 'sent', txHash: record.txHash };

      try {
        await publicClient.sendRawTransaction({
          serializedTransaction: record.raw,
        });
        await this.ctx.storage.put(key, {
          ...record,
          status: 'sent',
          updatedAt: Date.now(),
        } satisfies RelayRecord);
        return { status: 'sent', txHash: record.txHash };
      } catch {
        return { status: 'sent', txHash: record.txHash };
      }
    }

    try {
      const used = (await publicClient.readContract({
        address: config.contractAddress,
        abi: NFT_ABI,
        functionName: 'usedClaimKey',
        args: [request.claimKey],
      })) as boolean;
      if (used) return { status: 'already_claimed' };
    } catch {
      // RPC is best-effort here; the contract still enforces uniqueness.
    }

    const balance = await publicClient.getBalance({
      address: config.relayerAddress,
    });
    if (balance < config.relayerMinBalanceWei) {
      console.warn('[classy nft] relayer balance is below the minimum');
      return { status: 'unavailable', reason: 'balance' };
    }

    const block = await publicClient.getBlock();
    const baseFee = block.baseFeePerGas ?? 0n;
    const maxPriorityFeePerGas = config.maxPriorityFeePerGasWei;
    const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;
    if (maxFeePerGas > config.maxFeePerGasWei) {
      return { status: 'unavailable', reason: 'gas_cap' };
    }

    const args = [
      request.to,
      request.theme,
      request.claimKey,
      BigInt(request.deadline),
      request.signature,
    ] as const;

    let gas: bigint;
    try {
      gas = await publicClient.estimateContractGas({
        address: config.contractAddress,
        abi: NFT_ABI,
        functionName: 'mintWithSignature',
        args,
        account: config.relayerAddress,
      });
    } catch (error) {
      const revert = revertNameOf(error);
      if (revert === 'SoldOut') return { status: 'sold_out' };
      if (revert === 'ClaimAlreadyUsed') {
        return { status: 'already_claimed' };
      }
      console.warn('[classy nft] relay simulation failed:', revert ?? 'unknown');
      return { status: 'retry_later', reason: 'simulation' };
    }

    const gasLimit = (gas * GAS_LIMIT_MULTIPLIER) / GAS_LIMIT_DIVISOR;
    const estimatedCost = gasLimit * maxFeePerGas;

    const day = new Date().toISOString().slice(0, 10);
    const spendKey = `spend:${day}`;
    const spent = (await this.ctx.storage.get<bigint>(spendKey)) ?? 0n;
    if (spent + estimatedCost > config.relayDailyCapWei) {
      return { status: 'unavailable', reason: 'budget' };
    }

    const nonce = await publicClient.getTransactionCount({
      address: config.relayerAddress,
      blockTag: 'pending',
    });

    const account = privateKeyToAccount(config.relayerPrivateKey);
    const wallet = createWalletClient({
      account,
      chain: chainFor(config.chainId),
      transport: http(config.rpcUrl, { timeout: 10_000 }),
    });

    let raw: Hex;
    try {
      raw = await wallet.signTransaction({
        account,
        to: config.contractAddress,
        data: encodeFunctionData({
          abi: NFT_ABI,
          functionName: 'mintWithSignature',
          args,
        }),
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        type: 'eip1559',
      });
    } catch (error) {
      console.warn(
        '[classy nft] relay signing failed:',
        error instanceof Error ? error.message : error
      );
      return { status: 'retry_later', reason: 'sign' };
    }

    const txHash = keccak256(raw);
    const next: RelayRecord = {
      status: 'sending',
      txHash,
      raw,
      nonce,
      updatedAt: Date.now(),
    };

    await this.ctx.storage.put(key, next);
    await this.ctx.storage.put(spendKey, spent + estimatedCost);

    try {
      await publicClient.sendRawTransaction({ serializedTransaction: raw });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : 'unknown';
      if (
        !message.includes('already known') &&
        !message.includes('nonce too low') &&
        !message.includes('already imported')
      ) {
        await this.ctx.storage.put(key, {
          ...next,
          status: 'failed',
          updatedAt: Date.now(),
        } satisfies RelayRecord);
        console.warn('[classy nft] relay broadcast failed:', message);
        return { status: 'retry_later', reason: 'broadcast' };
      }
    }

    await this.ctx.storage.put(key, {
      ...next,
      status: 'sent',
      updatedAt: Date.now(),
    } satisfies RelayRecord);

    return { status: 'sent', txHash };
  }

  private async hasSettled(
    client: ReturnType<typeof nftPublicClient>,
    txHash: Hex
  ): Promise<boolean> {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      return receipt.status === 'success';
    } catch {
      return false;
    }
  }
}

export const relayObjectName = RELAY_OBJECT_NAME;
