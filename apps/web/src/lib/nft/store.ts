import type { UsersKv } from '../users-kv.ts';
import { isTheme, type Theme } from './types.ts';

export type ClaimStatus = 'issued' | 'confirmed';

export interface ClaimRecord {
  login: string;
  ghId: number;
  theme: Theme;
  wallet: string;
  claimKey: string;
  /** Unix seconds */
  deadline: number;
  status: ClaimStatus;
  tokenId?: number;
  serial?: number;
  txHash?: string;
  /** Unix milliseconds */
  createdAt: number;
  /** Unix milliseconds */
  confirmedAt?: number;
}

const PREFIX = 'nft:claim:';

export const claimKeyFor = (ghId: number, theme: Theme): string =>
  `${PREFIX}${ghId}:${theme}`;

const parseClaim = (value: string | null): ClaimRecord | null => {
  if (!value) return null;
  try {
    const record = JSON.parse(value) as ClaimRecord;
    if (
      typeof record.login !== 'string' ||
      typeof record.ghId !== 'number' ||
      !isTheme(record.theme) ||
      typeof record.wallet !== 'string' ||
      typeof record.claimKey !== 'string' ||
      typeof record.deadline !== 'number' ||
      (record.status !== 'issued' && record.status !== 'confirmed')
    ) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
};

export const getClaim = async (
  kv: UsersKv,
  ghId: number,
  theme: Theme
): Promise<ClaimRecord | null> => {
  try {
    return parseClaim(await kv.get(claimKeyFor(ghId, theme)));
  } catch {
    return null;
  }
};

export const putClaim = async (
  kv: UsersKv,
  record: ClaimRecord
): Promise<void> => {
  await kv.put(claimKeyFor(record.ghId, record.theme), JSON.stringify(record));
};

export const listClaims = async (
  kv: UsersKv,
  ghId: number
): Promise<ClaimRecord[]> => {
  try {
    const result = await kv.list({
      prefix: `${PREFIX}${ghId}:`,
      limit: 10,
    });
    const records = await Promise.all(
      result.keys.map(async (key) => parseClaim(await kv.get(key.name)))
    );
    return records
      .filter((record): record is ClaimRecord => record !== null)
      .sort((a, b) => a.theme - b.theme);
  } catch {
    return [];
  }
};

/** `issued` records past their deadline behave as `expired`. */
export const effectiveStatus = (
  record: ClaimRecord,
  now = Date.now()
): ClaimStatus | 'expired' =>
  record.status === 'issued' && record.deadline * 1000 <= now
    ? 'expired'
    : record.status;
