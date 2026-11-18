import type { Address } from 'viem';

export const NFT_ABI = [
  {
    type: 'function',
    name: 'getStats',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[4]' }],
  },
  {
    type: 'function',
    name: 'mintWithSignature',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'theme', type: 'uint8' },
      { name: 'claimKey', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'signer',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'usedClaimKey',
    stateMutability: 'view',
    inputs: [{ name: 'claimKey', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'Minted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'theme', type: 'uint8', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'serial', type: 'uint256', indexed: false },
      { name: 'claimKey', type: 'bytes32', indexed: false },
    ],
  },
  // Revert reasons. viem only decodes a custom error into `data.errorName`
  // when the ABI lists it; the UI uses this to turn a `SoldOut` rollback into
  // the sold-out card state instead of a generic error.
  { type: 'error', name: 'InvalidRecipient', inputs: [] },
  {
    type: 'error',
    name: 'InvalidTheme',
    inputs: [{ name: 'theme', type: 'uint8' }],
  },
  { type: 'error', name: 'InvalidSigner', inputs: [] },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  {
    type: 'error',
    name: 'Expired',
    inputs: [{ name: 'deadline', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'ClaimAlreadyUsed',
    inputs: [{ name: 'claimKey', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'SoldOut',
    inputs: [{ name: 'theme', type: 'uint8' }],
  },
] as const;

export const MINT_TYPES = {
  Mint: [
    { name: 'to', type: 'address' },
    { name: 'theme', type: 'uint8' },
    { name: 'claimKey', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export const mintDomain = ({
  chainId,
  verifyingContract,
}: {
  chainId: number;
  verifyingContract: Address;
}) => ({
  name: 'ClassyGit Pass',
  version: '1',
  chainId,
  verifyingContract,
});
