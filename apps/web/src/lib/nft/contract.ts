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
