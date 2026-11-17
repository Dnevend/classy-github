/**
 * OG 卡片 HTML 的断言测试：`node --experimental-strip-types scripts/og-smoke.ts`
 *
 * 背景：Satori 的 background-image 只认 gradient / url()，写 `none` 会抛
 * `Invalid background image`，导致无封面的 OG 图变成 0 字节空白。
 * 这里锁住「无封面时不能出现 background-image」这条规则。
 */
import assert from 'node:assert/strict';

import { asciiName, buildOgCardHtml } from '../src/lib/og-card.ts';
import { THEME_PALETTE } from '../src/lib/theme-palette.ts';

type Case = { name: string; run: () => void };

const base = {
  login: 'shadowzzh',
  name: 'ziheng',
  publicRepos: 134,
  publicGists: 2,
  followers: 29,
  stars: 1200,
  theme: 'mac' as const,
  palette: THEME_PALETTE.mac,
  host: 'classygit.dev',
  avatar: null,
};

const cases: Case[] = [
  {
    name: '无封面：完全不输出 background-image（不能是 none）',
    run: () => {
      const html = buildOgCardHtml({ ...base, cover: null });
      assert.equal(html.includes('background-image'), false);
      assert.equal(html.includes('background:none'), false);
      // 背景色仍然生效
      assert.equal(html.includes('background-color:#ffffff'), true);
      assert.equal(html.includes('@shadowzzh'), true);
      assert.equal(html.includes('ziheng'), true);
    },
  },
  {
    name: '有封面：输出 url(data:) 背景和深色渐变',
    run: () => {
      const html = buildOgCardHtml({
        ...base,
        cover: 'data:image/jpeg;base64,AAAA',
      });
      assert.equal(
        html.includes('background-image:url(data:image/jpeg;base64,AAAA)'),
        true
      );
      assert.equal(html.includes('background-size:cover'), true);
      assert.equal(html.includes('linear-gradient(180deg'), true);
      assert.equal(html.includes('color:#ffffff'), true);
    },
  },
  {
    name: '头像 data URL 会进 <img>，缺失时用色块兜底',
    run: () => {
      const withAvatar = buildOgCardHtml({
        ...base,
        cover: null,
        avatar: 'data:image/png;base64,BBBB',
      });
      assert.equal(
        withAvatar.includes('<img src="data:image/png;base64,BBBB"'),
        true
      );

      const withoutAvatar = buildOgCardHtml({ ...base, cover: null });
      assert.equal(withoutAvatar.includes('<img'), false);
      assert.equal(withoutAvatar.includes('border-radius:64px'), true);
    },
  },
  {
    name: '四套主题都能渲染，且无封面时不带 background-image',
    run: () => {
      for (const theme of ['nes', 'mac', 'win98', 'tui'] as const) {
        const html = buildOgCardHtml({
          ...base,
          theme,
          palette: THEME_PALETTE[theme],
          cover: null,
        });
        assert.equal(html.includes('background-image'), false, theme);
        assert.equal(html.includes(theme.toUpperCase()), true, theme);
      }
    },
  },
  {
    name: '非 ASCII / 超长名字回退到 login',
    run: () => {
      assert.equal(asciiName('ziheng', 'Shadowzzh'), 'ziheng');
      assert.equal(asciiName('中文名字', 'Shadowzzh'), 'Shadowzzh');
      assert.equal(asciiName(undefined, 'Shadowzzh'), 'Shadowzzh');
      assert.equal(asciiName('a'.repeat(29), 'Shadowzzh'), 'Shadowzzh');
    },
  },
];

let failed = 0;

for (const { name, run } of cases) {
  try {
    run();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`    ${(error as Error).message.split('\n')[0]}`);
  }
}

assert.equal(failed, 0, `${failed} 条 OG 断言失败`);
console.log(`og smoke ok (${cases.length} cases)`);
