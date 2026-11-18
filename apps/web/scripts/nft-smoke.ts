import assert from 'node:assert/strict';
import {
  getAddress,
  keccak256,
  recoverTypedDataAddress,
  toBytes,
  type Hex,
} from 'viem';
import type { ConfigState } from '../src/lib/config-loader.ts';
import { checkEligibility, isAccountOldEnough } from '../src/lib/nft/eligibility.ts';
import { deriveClaimKey } from '../src/lib/nft/claim-key.ts';
import { MINT_TYPES, mintDomain } from '../src/lib/nft/contract.ts';
import { clearCookie } from '../src/lib/nft/http.ts';
import { buildClaimMessage } from '../src/lib/nft/message.ts';
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchGitHubUser,
  OAuthError,
} from '../src/lib/nft/oauth.ts';
import {
  createOAuthState,
  createSession,
  sessionCookieName,
  verifyOAuthState,
  verifySession,
} from '../src/lib/nft/session.ts';
import {
  effectiveStatus,
  getClaim,
  listClaims,
  putClaim,
  type ClaimRecord,
} from '../src/lib/nft/store.ts';
import { isTheme, themeName } from '../src/lib/nft/types.ts';
import { signMintVoucher } from '../src/lib/nft/voucher.ts';
import type { UsersKv } from '../src/lib/users-kv.ts';

const baseConfig = { owner: 'alice' } as ConfigState['config'];

const state = (overrides: Partial<ConfigState> = {}): ConfigState => ({
  config: baseConfig,
  configured: true,
  reliable: true,
  source: 'repo',
  ...overrides,
});

const makeKv = (): UsersKv => {
  const map = new Map<string, string>();
  return {
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => {
      map.set(key, value);
    },
    delete: async (key) => {
      map.delete(key);
    },
    list: async ({ prefix = '', limit = 1000 } = {}) => ({
      keys: [...map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name })),
      list_complete: true,
    }),
  };
};

const main = async (): Promise<void> => {
  // Eligibility: strict owner check, not just `configured`.
  assert.equal(checkEligibility(state(), 'alice').reason, 'ok');
  assert.equal(
    checkEligibility(
      state({ config: { ...baseConfig, owner: null } }),
      'alice'
    ).reason,
    'owner_mismatch'
  );
  assert.equal(
    checkEligibility(
      state({ config: { ...baseConfig, owner: 'bob' } }),
      'alice'
    ).reason,
    'owner_mismatch'
  );
  assert.equal(
    checkEligibility(state({ source: 'template' }), 'alice').reason,
    'no_config'
  );
  assert.equal(
    checkEligibility(state({ reliable: false }), 'alice').reason,
    'github_unavailable'
  );

  const nowMs = Date.now();
  assert.equal(
    isAccountOldEnough(
      new Date(nowMs - 91 * 86_400_000).toISOString(),
      90,
      nowMs
    ),
    true
  );
  assert.equal(
    isAccountOldEnough(
      new Date(nowMs - 89 * 86_400_000).toISOString(),
      90,
      nowMs
    ),
    false
  );
  assert.equal(isAccountOldEnough('not-a-date', 90, nowMs), false);

  // Session: signed payload, tamper detection, expiry.
  const secret = 'nft-smoke-secret-with-enough-entropy';
  const now = 1_700_000_000_000;
  const token = await createSession(
    {
      ghId: 42,
      login: 'alice',
      createdAt: '2020-01-01T00:00:00Z',
    },
    secret,
    900,
    now
  );
  const payload = await verifySession(token, secret, now + 1_000);
  assert.equal(payload?.login, 'alice');
  assert.equal(await verifySession(`${token}x`, secret, now + 1_000), null);
  assert.equal(await verifySession(token, secret, now + 901_000), null);

  // OAuth state: signed cookie value, mismatch and expiry.
  const oauth = await createOAuthState(secret, 600, now);
  assert.equal(
    await verifyOAuthState(oauth.cookieValue, oauth.state, secret, now + 1_000),
    true
  );
  assert.equal(
    await verifyOAuthState(oauth.cookieValue, 'other', secret, now + 1_000),
    false
  );
  assert.equal(
    await verifyOAuthState(oauth.cookieValue, oauth.state, secret, now + 601_000),
    false
  );

  // OAuth helpers: URL shape + token/user exchange with a stub fetch.
  const authorizeUrl = buildAuthorizeUrl({
    clientId: 'client',
    redirectUri: 'http://localhost:4321/api/nft/oauth/callback',
    state: 'state',
  });
  assert.match(authorizeUrl, /client_id=client/);
  assert.match(
    authorizeUrl,
    /redirect_uri=http%3A%2F%2Flocalhost%3A4321%2Fapi%2Fnft%2Foauth%2Fcallback/
  );
  assert.match(authorizeUrl, /state=state/);

  const jsonFetch = (payload: unknown, status = 200) =>
    (async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;

  assert.equal(
    await exchangeCode({
      clientId: 'client',
      clientSecret: 'secret',
      code: 'code',
      redirectUri: 'http://localhost:4321/api/nft/oauth/callback',
      fetchImpl: jsonFetch({ access_token: 'token' }),
    }),
    'token'
  );

  const oauthUser = await fetchGitHubUser(
    'token',
    jsonFetch({
      id: 42,
      login: 'alice',
      created_at: '2020-01-01T00:00:00Z',
    })
  );
  assert.equal(oauthUser.login, 'alice');

  await assert.rejects(
    exchangeCode({
      clientId: 'client',
      clientSecret: 'secret',
      code: 'bad',
      redirectUri: 'http://localhost:4321/api/nft/oauth/callback',
      fetchImpl: jsonFetch({ error: 'bad_verification_code' }, 400),
    }),
    (error: unknown) =>
      error instanceof OAuthError && error.code === 'bad_verification_code'
  );

  // Claim key: deterministic per (ghId, theme), different across themes.
  const salt = (`0x${'11'.repeat(32)}`) as Hex;
  const keyA = deriveClaimKey(42, 0, salt);
  const keyB = deriveClaimKey(42, 0, salt);
  const keyC = deriveClaimKey(42, 1, salt);
  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);

  // Message format is shared with the frontend.
  const message = buildClaimMessage({
    login: 'alice',
    ghId: 42,
    address: '0x0000000000000000000000000000000000000001',
    theme: 0,
    claimKey: `0x${'22'.repeat(32)}`,
    deadline: 1_700_000_000,
  });
  assert.match(message, /^ClassyGit Pass claim\n/);
  assert.match(message, /GitHub: @alice \(id: 42\)/);
  assert.match(message, /Theme: mac/);
  assert.match(message, /Expires At: 2023-11-14T22:13:20.000Z/);

  // Voucher signature recovers to the configured signer.
  const signerPrivateKey = keccak256(
    toBytes('classygit-nft-smoke-signer')
  ) as Hex;
  const to = getAddress('0x0000000000000000000000000000000000000001');
  const verifyingContract = getAddress(
    '0x0000000000000000000000000000000000000002'
  );
  const claimKey = (`0x${'33'.repeat(32)}`) as Hex;
  const deadline = 1_700_000_000;
  const signed = await signMintVoucher({
    signerPrivateKey,
    chainId: 84532,
    verifyingContract,
    to,
    theme: 0,
    claimKey,
    deadline,
  });
  const recovered = await recoverTypedDataAddress({
    domain: mintDomain({ chainId: 84532, verifyingContract }),
    types: MINT_TYPES,
    primaryType: 'Mint',
    message: { to, theme: 0, claimKey, deadline: BigInt(deadline) },
    signature: signed.signature,
  });
  assert.equal(recovered.toLowerCase(), signed.signer.toLowerCase());

  // Claim storage: keyed by (ghId, theme), expiry is computed.
  const kv = makeKv();
  const record: ClaimRecord = {
    login: 'alice',
    ghId: 42,
    theme: 0,
    wallet: to,
    claimKey,
    deadline: Math.floor(now / 1000) + 900,
    status: 'issued',
    createdAt: now,
  };
  await putClaim(kv, record);
  assert.equal((await getClaim(kv, 42, 0))?.claimKey, claimKey);
  assert.equal((await listClaims(kv, 42)).length, 1);
  assert.equal(effectiveStatus(record, record.deadline * 1000), 'issued');
  assert.equal(effectiveStatus(record, record.deadline * 1000 + 1), 'expired');

  // A legacy `issued` record under the confirmed key must not mask a new one.
  const legacyKv = makeKv();
  await legacyKv.put(
    'nft:claim:42:0',
    JSON.stringify({ ...record, status: 'issued' })
  );
  assert.equal(await getClaim(legacyKv, 42, 0), null);

  // Clearing a production `__Host-` cookie must keep Secure + Path=/.
  const cookieWrites: {
    name: string;
    value: string;
    options: { secure?: boolean; maxAge?: number; path?: string };
  }[] = [];
  clearCookie(
    {
      set: (name, value, options) => {
        cookieWrites.push({ name, value, options });
      },
    },
    sessionCookieName(true),
    new URL('https://classygit.dev/nft')
  );
  assert.equal(cookieWrites[0]?.options.secure, true);
  assert.equal(cookieWrites[0]?.options.maxAge, 0);
  assert.equal(cookieWrites[0]?.options.path, '/');
  assert.equal(cookieWrites[0]?.value, '');

  // A late pending write must never turn a confirmed claim back into `issued`.
  const confirmed: ClaimRecord = {
    ...record,
    status: 'confirmed',
    tokenId: 2,
    serial: 2,
    confirmedAt: now,
  };
  await putClaim(kv, confirmed);
  await putClaim(kv, {
    ...record,
    status: 'issued',
    deadline: record.deadline + 1000,
  });
  assert.equal((await getClaim(kv, 42, 0))?.status, 'confirmed');
  assert.equal((await listClaims(kv, 42))[0]?.status, 'confirmed');

  assert.equal(themeName(0), 'mac');
  assert.equal(themeName(3), 'tui');
  assert.equal(isTheme(4), false);

  console.log('nft smoke ok');
};

await main();
