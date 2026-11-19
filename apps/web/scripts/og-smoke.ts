/**
 * OG 卡片 HTML 的断言测试：`node --experimental-strip-types scripts/og-smoke.ts`
 *
 * 背景：Satori 的 background-image 只认 gradient / url()，写 `none` 会抛
 * `Invalid background image`，导致无封面的 OG 图变成 0 字节空白。
 * 这里锁住「无封面时不能出现 background-image」这条规则。
 */
import assert from 'node:assert/strict';

import { asciiName, buildOgCardHtml } from '../src/lib/og-card.ts';
import {
  OG_FETCH_HEADER,
  isBlockedSameOriginCoverPath,
  isOgFetchRequest,
  readBoundedBody,
} from '../src/lib/og-cover.ts';
import { THEME_PALETTE } from '../src/lib/theme-palette.ts';

type Case = { name: string; run: () => void | Promise<void> };

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
    name: '同源动态路由不能作为 OG 封面（防递归）',
    run: () => {
      assert.equal(isBlockedSameOriginCoverPath('/og/Dnevend.png'), true);
      assert.equal(isBlockedSameOriginCoverPath('/api/hit/Dnevend'), true);
      assert.equal(isBlockedSameOriginCoverPath('/card/Dnevend'), true);
      assert.equal(isBlockedSameOriginCoverPath('/badge/Dnevend.svg'), true);
      assert.equal(isBlockedSameOriginCoverPath('/setup'), true);
      assert.equal(isBlockedSameOriginCoverPath('/%6fg/Dnevend.png'), true);
      assert.equal(isBlockedSameOriginCoverPath('/images/cover.jpg'), false);
      assert.equal(isBlockedSameOriginCoverPath('/cursors/mac-arrow.svg'), false);
    },
  },
  {
    name: '内部抓取头能识别嵌套 OG 请求',
    run: () => {
      assert.equal(
        isOgFetchRequest(
          new Request('https://classygit.dev/og/Dnevend.png', {
            headers: { [OG_FETCH_HEADER]: '1' },
          })
        ),
        true
      );
      assert.equal(
        isOgFetchRequest(new Request('https://classygit.dev/og/Dnevend.png')),
        false
      );
    },
  },
  {
    name: '封面/头像读取有大小上限',
    run: async () => {
      const ok = await readBoundedBody(
        new Response(new Uint8Array([1, 2, 3, 4])),
        4
      );
      assert.equal(ok?.byteLength, 4);

      assert.equal(
        await readBoundedBody(new Response(new Uint8Array([1, 2, 3, 4, 5])), 4),
        null
      );

      const declared = new Response(new Uint8Array([1]), {
        headers: { 'content-length': '100' },
      });
      assert.equal(await readBoundedBody(declared, 4), null);

      assert.equal(await readBoundedBody(new Response(null), 4), null);
    },
  },
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
    await run();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`    ${(error as Error).message.split('\n')[0]}`);
  }
}

assert.equal(failed, 0, `${failed} 条 OG 断言失败`);
console.log(`og smoke ok (${cases.length} cases)`);
