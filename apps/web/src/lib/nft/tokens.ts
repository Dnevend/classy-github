import { PER_THEME, TOTAL_SUPPLY, type Theme } from './types.ts';

export interface TokenLocation {
  theme: Theme;
  serial: number;
}

/** Token ids are allocated in fixed per-theme ranges (mac, nes, win98, tui). */
export const locateToken = (tokenId: number): TokenLocation | null => {
  if (
    !Number.isSafeInteger(tokenId) ||
    tokenId < 1 ||
    tokenId > TOTAL_SUPPLY
  ) {
    return null;
  }

  const index = Math.floor((tokenId - 1) / PER_THEME);
  return {
    theme: index as Theme,
    serial: tokenId - index * PER_THEME,
  };
};

export const tokenIdFor = (theme: Theme, serial: number): number | null => {
  if (
    !Number.isSafeInteger(serial) ||
    serial < 1 ||
    serial > PER_THEME
  ) {
    return null;
  }
  return theme * PER_THEME + serial;
};
