import {
  encodeAbiParameters,
  keccak256,
  type Hex,
} from 'viem';
import { isTheme, type Theme } from './types.ts';

/**
 * claimKey = keccak256(abi.encode(ghId, theme, CLAIM_SALT))
 *
 * The salt is a server secret. The contract only stores whether a key was
 * used, so the GitHub identity never reaches the chain.
 */
export const deriveClaimKey = (
  ghId: number,
  theme: Theme,
  salt: Hex
): Hex => {
  if (!Number.isSafeInteger(ghId) || ghId <= 0) {
    throw new Error('invalid GitHub id');
  }
  if (!isTheme(theme)) throw new Error('invalid theme');
  if (!/^0x[0-9a-fA-F]{64}$/.test(salt)) {
    throw new Error('CLAIM_SALT must be a 32-byte hex string');
  }

  return keccak256(
    encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'uint8' }, { type: 'bytes32' }],
      [BigInt(ghId), theme, salt]
    )
  );
};
