import { themeName, type Theme } from './types.ts';

export interface ClaimMessageInput {
  login: string;
  ghId: number;
  address: string;
  theme: Theme;
  claimKey: string;
  /** Unix seconds */
  deadline: number;
}

/**
 * The exact message the wallet signs before a voucher is issued.
 *
 * The server rebuilds this string from the request and verifies the signature;
 * the frontend imports the same function so both sides stay in sync.
 */
export const buildClaimMessage = ({
  login,
  ghId,
  address,
  theme,
  claimKey,
  deadline,
}: ClaimMessageInput): string =>
  [
    'ClassyGit Pass claim',
    `GitHub: @${login} (id: ${ghId})`,
    `Wallet: ${address}`,
    `Theme: ${themeName(theme)}`,
    `Claim-Key: ${claimKey}`,
    `Expires At: ${new Date(deadline * 1000).toISOString()}`,
  ].join('\n');
