// Manual integration test for the NFT API on Base Sepolia.
// Requires `pnpm dev`, `apps/web/.dev.vars`, and `contracts/.env`.
// Uses a fake ghId and mints one test card; never run against mainnet.
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  toBytes,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { NFT_ABI } from '../src/lib/nft/contract.ts';
import { createSession } from '../src/lib/nft/session.ts';

const API = 'http://localhost:4321';
const secret = process.env.NFT_SESSION_SECRET;
const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
const rpcUrl = process.env.BASE_RPC_URL;
const ownerKey = process.env.PRIVATE_KEY as Hex | undefined;

if (!secret || !contractAddress || !rpcUrl || !ownerKey) {
  throw new Error('missing NFT env');
}

const gitHubResponse = await fetch(
  'https://api.github.com/users/Dnevend',
  {
    headers: {
      'user-agent': 'classy-nft-api-smoke',
      ...(process.env.GITHUB_TOKEN
        ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  }
);
const gitHubUser = (await gitHubResponse.json()) as {
  id?: number;
  login?: string;
  created_at?: string;
};
if (!gitHubUser.id || !gitHubUser.login || !gitHubUser.created_at) {
  throw new Error(`GitHub user lookup failed: ${gitHubResponse.status}`);
}

// Manual test only: use a fake ghId so this does not consume a real
// GitHub account's claim slot. Eligibility still runs against the real login.
const TEST_GH_ID = 987_654_321;

const session = await createSession(
  {
    ghId: TEST_GH_ID,
    login: gitHubUser.login,
    createdAt: gitHubUser.created_at,
  },
  secret,
  15 * 60
);
const cookie = `classy_nft_dev=${encodeURIComponent(session)}`;

const post = async (
  path: string,
  body: unknown
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${text}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
};

const testAccount = privateKeyToAccount(
  keccak256(toBytes('classy-nft-api-smoke-wallet'))
);
const address = testAccount.address;

const prepared = (await post('/api/nft/prepare', {
  theme: 0,
  address,
})) as {
  message: string;
  deadline: number;
  claimKey: Hex;
};

const signature = await testAccount.signMessage({
  message: prepared.message,
});

const voucher = (await post('/api/nft/voucher', {
  theme: 0,
  address,
  deadline: prepared.deadline,
  signature,
})) as {
  claimKey: Hex;
  signature: Hex;
};

const owner = privateKeyToAccount(ownerKey);
const wallet = createWalletClient({
  account: owner,
  chain: baseSepolia,
  transport: http(rpcUrl),
});
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

const hash = await wallet.writeContract({
  address: getAddress(contractAddress),
  abi: NFT_ABI,
  functionName: 'mintWithSignature',
  args: [
    address,
    0,
    voucher.claimKey,
    BigInt(prepared.deadline),
    voucher.signature,
  ],
});

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== 'success') throw new Error('mint reverted');

const confirmed = (await post('/api/nft/confirm', {
  txHash: hash,
})) as {
  tokenId?: number;
  serial?: number;
};

const sessionResponse = await fetch(`${API}/api/nft/session`, {
  headers: { cookie },
});
const sessionData = (await sessionResponse.json()) as {
  authenticated?: boolean;
  claims?: { theme?: number; status?: string }[];
};

console.log(
  JSON.stringify(
    {
      ok: true,
      address,
      tokenId: confirmed.tokenId,
      serial: confirmed.serial,
      txHash: hash,
      claimStatus: sessionData.claims?.[0]?.status ?? null,
      authenticated: sessionData.authenticated === true,
    },
    null,
    2
  )
);
