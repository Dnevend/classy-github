// Manual integration test for the Phase 6 gallery APIs on Base Sepolia.
// Requires `pnpm dev` and `apps/web/.dev.vars`.
// Usage: node --experimental-strip-types scripts/nft-gallery-smoke.ts
import assert from 'node:assert/strict';
import { locateToken } from '../src/lib/nft/tokens.ts';

const API = process.env.NFT_API_URL ?? 'http://localhost:4321';
if (process.env.NFT_CHAIN_ID === '8453') {
  throw new Error('refusing to run the gallery smoke against mainnet');
}

const getJson = async (path: string) => {
  const response = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json' },
  });
  return { status: response.status, data: await response.json() };
};

const recent = await getJson('/api/nft/recent');
assert.equal(recent.status, 200);
assert.ok(Array.isArray(recent.data.mints));
assert.ok(recent.data.mints.length <= 12);
assert.equal(typeof recent.data.total, 'number');

for (const mint of recent.data.mints) {
  assert.ok(Number.isInteger(mint.tokenId));
  const location = locateToken(mint.tokenId);
  assert.ok(location, `tokenId ${mint.tokenId} outside the edition`);
  assert.equal(mint.theme, location.theme);
  assert.equal(mint.serial, location.serial);
  assert.match(mint.owner, /^0x[0-9a-fA-F]{40}$/);
}

const serialized = JSON.stringify(recent.data);
assert.ok(!serialized.includes('login'), 'recent must not expose GitHub login');
assert.ok(!serialized.includes('ghId'), 'recent must not expose GitHub id');

if (recent.data.mints.length > 0) {
  const first = recent.data.mints[0];
  const cards = await getJson(
    `/api/nft/cards?address=${encodeURIComponent(first.owner)}`
  );
  assert.equal(cards.status, 200);
  assert.equal(cards.data.address.toLowerCase(), first.owner.toLowerCase());
  assert.ok(cards.data.balance >= cards.data.cards.length);
  assert.ok(
    cards.data.cards.some((card: { tokenId: number }) => card.tokenId === first.tokenId),
    'owner lookup should include the recent token'
  );
  const cardsJson = JSON.stringify(cards.data);
  assert.ok(!cardsJson.includes('login'), 'cards must not expose GitHub login');
  assert.ok(!cardsJson.includes('ghId'), 'cards must not expose GitHub id');

  const cardPage = await fetch(`${API}/nft/card/${first.tokenId}`);
  assert.equal(cardPage.status, 200);
  assert.match(await cardPage.text(), /ClassyGit Pass/);
}

const missingToken = await fetch(`${API}/nft/card/999999`);
assert.equal(missingToken.status, 404);

const invalid = await getJson('/api/nft/cards?address=not-an-address');
assert.equal(invalid.status, 400);
assert.equal(invalid.data.error, 'invalid_address');

console.log('nft gallery smoke ok', {
  total: recent.data.total,
  recent: recent.data.mints.length,
});
