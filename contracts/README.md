# ClassyPass contracts

`ClassyPass` is the NFT contract for the ClassyGit Pass campaign.

- ERC-721 + Enumerable
- 4 themes: mac / nes / win98 / tui
- 2212 cards per theme, 8848 total
- Transferable
- Free mint, authorized by an off-chain EIP-712 voucher
- `claimKey` makes a `(GitHub account, theme)` pair unique on-chain without storing the GitHub identity

## Layout

```text
contracts/
  src/ClassyPass.sol        contract
  test/ClassyPass.t.sol     Foundry tests
  script/Deploy.s.sol       deploy script
  abi/ClassyPass.json       generated ABI (for the Worker / frontend)
  foundry.toml
```

Regenerate the ABI after changing the contract:

```bash
forge inspect src/ClassyPass.sol:ClassyPass abi --json > abi/ClassyPass.json
```

## Setup

From the repository root:

```bash
pnpm install
```

The OpenZeppelin dependency is resolved from `node_modules/@openzeppelin/contracts` (pinned in `contracts/package.json`).

If `lib/forge-std` is missing:

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
```

## Build and test

```bash
cd contracts
forge build --sizes
forge test -vv
```

Current result: 35 tests passing. Runtime size: 11,844 B (~11.6 KiB, EIP-170 limit is 24 KB).

The supply-cap test mints all 2212 mac cards, and the tui test mints all 2212 tui cards; the suite takes about 2–3 seconds.

## Deploy

Copy `.env.example` to `.env` and fill in:

```bash
PRIVATE_KEY=...
SIGNER_ADDRESS=0x...
OWNER_ADDRESS=0x...        # optional; defaults to the deployer
CONTRACT_URI=ipfs://...    # optional
BASE_RPC_URL=https://...
ETHERSCAN_API_KEY=...
```

If `OWNER_ADDRESS` is set to a different address, every admin call below must be sent by that owner, not by the deployer key. The simplest setup is to leave it unset.

`SIGNER_ADDRESS` must be an EOA: the contract verifies vouchers with `ECDSA.recover`, not EIP-1271.

Base Sepolia:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BASE_RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
```

Base mainnet: same command with a Base mainnet RPC.

After deployment, set the four theme images **before any mint** (the contract reverts with `ImageURINotSet` if the theme image is empty):

```bash
# Set the four theme images (IPFS or https).
cast send $CONTRACT "setImageURI(uint8,string)" 0 "ipfs://.../mac.png" --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
cast send $CONTRACT "setImageURI(uint8,string)" 1 "ipfs://.../nes.png" ...
cast send $CONTRACT "setImageURI(uint8,string)" 2 "ipfs://.../win98.png" ...
cast send $CONTRACT "setImageURI(uint8,string)" 3 "ipfs://.../tui.png" ...

# Optional: collection metadata.
cast send $CONTRACT "setContractURI(string)" "ipfs://..." --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

`setImageURI` accepts only printable ASCII URI characters (0x20–0x7E, excluding `"` and `\`). Percent-encode spaces, non-ASCII, and anything else. This keeps the JSON metadata valid UTF-8 and prevents string terminators / escapes.

## Claim key

The server computes:

```ts
claimKey = keccak256(abi.encode(ghId, theme, CLAIM_SALT))
```

`CLAIM_SALT` must stay stable forever. Rotating it would produce a new key for an already-claimed `(GitHub account, theme)` pair and break the on-chain uniqueness guarantee.

## Voucher

EIP-712 domain:

```text
name: ClassyGit Pass
version: 1
chainId: 8453 (Base) / 84532 (Base Sepolia)
verifyingContract: deployed address
```

Type:

```text
Mint(address to,uint8 theme,bytes32 claimKey,uint256 deadline)
```

The server signs with `NFT_SIGNER_PRIVATE_KEY`; the contract checks `signer`.

## Admin

- `setSigner(address)` — rotate the voucher signer.
- `setImageURI(uint8,string)` — fix a theme image.
- `setContractURI(string)` — update collection metadata.
- `pause()` / `unpause()` — stop / resume minting. Transfers are never paused.
- `Ownable2Step` — ownership transfer needs acceptance.
- `renounceOwnership()` — intentionally disabled; renouncing would permanently freeze the signer and any unset theme image.

## Security notes

- The contract holds no funds.
- A leaked signer key can mint cards up to the supply cap; pause and rotate the signer.
- The relayer key is separate and only pays gas.
- `_safeMint` is used, so a contract recipient must implement `onERC721Received`.
- Transfers are intentionally unrestricted.
