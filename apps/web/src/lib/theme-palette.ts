import type { ThemeName } from './config.ts';
import { parseThemeName } from './theme.ts';

export interface ThemePalette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  border: string;
}

/**
 * 统计卡 / 88×31 徽章共用的主题配色。
 * 主题名的唯一来源是 `lib/theme.ts`；`win95` 会归一为 `win98`。
 */
export const THEME_PALETTE: Record<ThemeName, ThemePalette> = {
  nes: {
    bg: '#212529',
    fg: '#f8f9fa',
    muted: '#adb5bd',
    accent: '#92cc41',
    border: '#6c757d',
  },
  win98: {
    bg: '#c0c0c0',
    fg: '#000000',
    muted: '#404040',
    accent: '#000080',
    border: '#808080',
  },
  mac: {
    bg: '#ffffff',
    fg: '#000000',
    muted: '#4a4a4a',
    accent: '#000000',
    border: '#000000',
  },
  tui: {
    bg: '#0000a8',
    fg: '#ffffff',
    muted: '#a8a8a8',
    accent: '#00a800',
    border: '#a8a8a8',
  },
};

export const paletteFor = (theme?: string | null): ThemePalette => {
  const name = parseThemeName(theme) ?? 'mac';
  return THEME_PALETTE[name];
};
