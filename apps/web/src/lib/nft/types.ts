export const THEME_NAMES = ['mac', 'nes', 'win98', 'tui'] as const;

export type Theme = 0 | 1 | 2 | 3;

export const isTheme = (value: unknown): value is Theme =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 3;

export const themeName = (theme: Theme): string => THEME_NAMES[theme];

export const PER_THEME = 2212;
export const TOTAL_SUPPLY = PER_THEME * 4;
