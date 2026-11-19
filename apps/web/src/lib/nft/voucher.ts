import { verifyTypedData, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MINT_TYPES, mintDomain } from './contract.ts';
import type { Theme } from './types.ts';

export interface SignVoucherInput {
  signerPrivateKey: Hex;
  chainId: number;
  verifyingContract: Address;
  to: Address;
  theme: Theme;
  claimKey: Hex;
  /** Unix seconds */
  deadline: number;
}

export interface Voucher {
  to: Address;
  theme: Theme;
  claimKey: Hex;
  deadline: number;
}

export const signMintVoucher = async ({
  signerPrivateKey,
  chainId,
  verifyingContract,
  to,
  theme,
  claimKey,
  deadline,
}: SignVoucherInput): Promise<{
  voucher: Voucher;
  signature: Hex;
  signer: Address;
}> => {
  if (!Number.isSafeInteger(deadline) || deadline <= 0) {
    throw new Error('invalid deadline');
  }

  const account = privateKeyToAccount(signerPrivateKey);
  const signature = await account.signTypedData({
    domain: mintDomain({ chainId, verifyingContract }),
    types: MINT_TYPES,
    primaryType: 'Mint',
    message: {
      to,
      theme,
      claimKey,
      deadline: BigInt(deadline),
    },
  });

  return {
    voucher: { to, theme, claimKey, deadline },
    signature,
    signer: account.address,
  };
};

/** Re-check a voucher before relaying it; the KV record alone is not proof. */
export const verifyMintVoucher = async ({
  signerAddress,
  chainId,
  verifyingContract,
  voucher,
  signature,
}: {
  signerAddress: Address;
  chainId: number;
  verifyingContract: Address;
  voucher: Voucher;
  signature: Hex;
}): Promise<boolean> => {
  if (!Number.isSafeInteger(voucher.deadline) || voucher.deadline <= 0) {
    return false;
  }

  try {
    return await verifyTypedData({
      address: signerAddress,
      domain: mintDomain({ chainId, verifyingContract }),
      types: MINT_TYPES,
      primaryType: 'Mint',
      message: {
        to: voucher.to,
        theme: voucher.theme,
        claimKey: voucher.claimKey,
        deadline: BigInt(voucher.deadline),
      },
      signature,
    });
  } catch {
    return false;
  }
};
