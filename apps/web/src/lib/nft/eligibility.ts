import type { ConfigState } from '../config-loader.ts';

export type EligibilityReason =
  | 'ok'
  | 'github_unavailable'
  | 'no_config'
  | 'owner_mismatch';

export interface EligibilityResult {
  ok: boolean;
  reason: EligibilityReason;
}

/**
 * Strict NFT eligibility:
 * - config was read reliably
 * - it came from the user's repo, not the template
 * - owner is explicitly set and matches the GitHub login
 *
 * `configured` alone is not enough: `isConfigForUser` accepts an empty owner
 * for backwards compatibility, which would let an empty config claim a card.
 */
export const checkEligibility = (
  state: ConfigState,
  login: string
): EligibilityResult => {
  if (!state.reliable) return { ok: false, reason: 'github_unavailable' };
  if (state.source !== 'repo') return { ok: false, reason: 'no_config' };

  const owner = state.config.owner;
  if (!owner || owner.toLowerCase() !== login.toLowerCase()) {
    return { ok: false, reason: 'owner_mismatch' };
  }

  return { ok: true, reason: 'ok' };
};

/** GitHub account must be at least `minDays` old. */
export const isAccountOldEnough = (
  createdAt: string,
  minDays = 90,
  now = Date.now()
): boolean => {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now - created >= minDays * 24 * 60 * 60 * 1000;
};
