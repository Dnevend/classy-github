/**
 * 主题配色一致性：`lib/theme.ts` 的 THEME_COLOR_SCHEMES 必须与各主题
 * `theme.css` 的 `color-scheme` 一致，否则 README 的主题变体图片会挑反。
 *
 * `node --experimental-strip-types scripts/theme-smoke.ts`
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { THEME_COLOR_SCHEMES } from '../src/lib/theme.ts';

/** 主题名与目录名不一定相同：win98 的样式在 win95/ */
const THEME_DIRS = {
  nes: 'nes',
  mac: 'mac',
  win98: 'win95',
  tui: 'tui',
} as const;

for (const [theme, dir] of Object.entries(THEME_DIRS)) {
  const css = readFileSync(
    new URL(`../src/themes/${dir}/theme.css`, import.meta.url),
    'utf8'
  );
  const match = /color-scheme:\s*(light|dark)/.exec(css);

  assert.equal(
    match?.[1],
    THEME_COLOR_SCHEMES[theme as keyof typeof THEME_COLOR_SCHEMES],
    `${theme} 的 color-scheme 与 THEME_COLOR_SCHEMES 不一致`
  );
}

console.log('theme smoke ok');
