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

/**
 * Two keys per claim:
 * - `nft:claim:` is written once, when the mint is confirmed. It is never
 *   overwritten by a pending voucher.
 * - `nft:voucher:` holds the short-lived issued voucher. This avoids a race
 *   where a late voucher write could turn a confirmed claim back into `issued`.
 */
const CONFIRMED_PREFIX = 'nft:claim:';
const PENDING_PREFIX = 'nft:voucher:';

export const claimKeyFor = (ghId: number, theme: Theme): string =>
  `${CONFIRMED_PREFIX}${ghId}:${theme}`;

const pendingKeyFor = (ghId: number, theme: Theme): string =>
  `${PENDING_PREFIX}${ghId}:${theme}`;

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
    const confirmed = parseClaim(await kv.get(claimKeyFor(ghId, theme)));
    // Ignore legacy `issued` records under the confirmed key; only a
    // `confirmed` record is authoritative.
    if (confirmed?.status === 'confirmed') return confirmed;
    return parseClaim(await kv.get(pendingKeyFor(ghId, theme)));
  } catch {
    return null;
  }
};

export const putClaim = async (
  kv: UsersKv,
  record: ClaimRecord
): Promise<void> => {
  if (record.status === 'confirmed') {
    await kv.put(claimKeyFor(record.ghId, record.theme), JSON.stringify(record));
    await kv
      .delete(pendingKeyFor(record.ghId, record.theme))
      .catch(() => undefined);
    return;
  }

  await kv.put(
    pendingKeyFor(record.ghId, record.theme),
    JSON.stringify(record)
  );
};

const listByPrefix = async (
  kv: UsersKv,
  prefix: string
): Promise<ClaimRecord[]> => {
  const result = await kv.list({ prefix, limit: 10 });
  const records = await Promise.all(
    result.keys.map(async (key) => parseClaim(await kv.get(key.name)))
  );
  return records.filter((record): record is ClaimRecord => record !== null);
};

export const listClaims = async (
  kv: UsersKv,
  ghId: number
): Promise<ClaimRecord[]> => {
  try {
    const [confirmed, pending] = await Promise.all([
      listByPrefix(kv, `${CONFIRMED_PREFIX}${ghId}:`),
      listByPrefix(kv, `${PENDING_PREFIX}${ghId}:`),
    ]);

    const byTheme = new Map<Theme, ClaimRecord>();
    for (const record of pending) byTheme.set(record.theme, record);
    for (const record of confirmed) {
      if (record.status === 'confirmed') byTheme.set(record.theme, record);
    }

    return [...byTheme.values()].sort((a, b) => a.theme - b.theme);
  } catch {
    return [];
  }
};

/** `issued` records past their deadline behave as `expired`. */
export const effectiveStatus = (
  record: ClaimRecord,
  now = Date.now()
): ClaimStatus | 'expired' =>
  record.status === 'issued' && record.deadline * 1000 < now
    ? 'expired'
    : record.status;
