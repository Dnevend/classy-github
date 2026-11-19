// Manual integration test for the gasless relayer on Base Sepolia.
// Requires `pnpm dev`, a funded relayer, and `apps/web/.dev.vars`.
// Usage: node --experimental-strip-types scripts/nft-relay-smoke.ts [theme]
// Uses random GitHub ids so it never consumes a real account's claim slot.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { getAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NFT_ABI } from '../src/lib/nft/contract.ts';
import { createSession, sessionCookieName } from '../src/lib/nft/session.ts';

const API = process.env.NFT_API_URL ?? 'http://localhost:4321';
if (process.env.NFT_CHAIN_ID === '8453') {
  throw new Error('refusing to run the relay smoke against mainnet');
}
const secret = process.env.NFT_SESSION_SECRET;
if (!secret) throw new Error('missing NFT_SESSION_SECRET');

const theme = Number(process.argv[2] ?? 1);
if (!Number.isInteger(theme) || theme < 0 || theme > 3) {
  throw new Error('theme must be 0..3');
}

const ghId = 900_000_000 + Math.floor(Math.random() * 100_000_000);
const account = privateKeyToAccount(`0x${randomBytes(32).toString('hex')}`);

const token = await createSession(
  { ghId, login: 'Dnevend', createdAt: '2017-12-29T00:25:17Z' },
  secret,
  900
);
const cookie = `${sessionCookieName(false)}=${token}`;

const post = async (
  path: string,
  body: unknown
): Promise<{ status: number; data: Record<string, unknown> }> => {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { text };
  }
  return { status: response.status, data };
};

const prepared = await post('/api/nft/prepare', {
  theme,
  address: account.address,
});
assert.equal(prepared.status, 200, JSON.stringify(prepared.data));
const message = prepared.data.message as string;
const deadline = prepared.data.deadline as number;

const walletSignature = await account.signMessage({ message });
const voucher = await post('/api/nft/voucher', {
  theme,
  address: account.address,
  deadline,
  signature: walletSignature,
});
assert.equal(voucher.status, 200, JSON.stringify(voucher.data));
const claimKey = voucher.data.claimKey as Hex;
const voucherSignature = voucher.data.signature as Hex;

const relayBody = {
  theme,
  address: account.address,
  claimKey,
  deadline,
  signature: voucherSignature,
};

const relayed = await post('/api/nft/relay', relayBody);
if (relayed.status === 503 && relayed.data.error === 'relayer_unavailable') {
  console.log('relay unavailable (fund the relayer to run the gasless path)');
  process.exit(0);
}
assert.equal(relayed.status, 200, JSON.stringify(relayed.data));
const txHash = relayed.data.txHash as Hex;

const again = await post('/api/nft/relay', relayBody);
assert.equal(again.status, 200, JSON.stringify(again.data));
assert.equal(again.data.txHash, txHash, 'relay must be idempotent');

const confirmed = await post('/api/nft/confirm', { txHash });
assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
assert.equal(confirmed.data.theme, theme);
assert.ok(Number(confirmed.data.tokenId) > 0);
assert.ok(Number(confirmed.data.serial) > 0);

// A tampered voucher signature must not be relayed.
const badGhId = ghId + 1;
const badAccount = privateKeyToAccount(`0x${randomBytes(32).toString('hex')}`);
const badToken = await createSession(
  { ghId: badGhId, login: 'Dnevend', createdAt: '2017-12-29T00:25:17Z' },
  secret,
  900
);
const badCookie = `${sessionCookieName(false)}=${badToken}`;
const badPost = async (path: string, body: unknown) => {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: badCookie },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};

const badPrepared = await badPost('/api/nft/prepare', {
  theme,
  address: badAccount.address,
});
assert.equal(badPrepared.status, 200);
const badDeadline = badPrepared.data.deadline as number;
const badWalletSignature = await badAccount.signMessage({
  message: badPrepared.data.message as string,
});
const badVoucher = await badPost('/api/nft/voucher', {
  theme,
  address: badAccount.address,
  deadline: badDeadline,
  signature: badWalletSignature,
});
assert.equal(badVoucher.status, 200);

const badSignature = `0x${'22'.repeat(65)}` as Hex;
const tampered = await badPost('/api/nft/relay', {
  theme,
  address: badAccount.address,
  claimKey: badVoucher.data.claimKey as Hex,
  deadline: badDeadline,
  signature: badSignature,
});
assert.equal(tampered.status, 401, JSON.stringify(tampered.data));

const wrongKey = await badPost('/api/nft/relay', {
  theme,
  address: badAccount.address,
  claimKey: `0x${'00'.repeat(32)}` as Hex,
  deadline: badDeadline,
  signature: badVoucher.data.signature as Hex,
});
assert.equal(wrongKey.status, 400, JSON.stringify(wrongKey.data));

console.log('nft relay smoke ok', {
  theme,
  txHash,
  tokenId: confirmed.data.tokenId,
  serial: confirmed.data.serial,
  wallet: getAddress(account.address) as Address,
});
