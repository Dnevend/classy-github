/**
 * 站内资源 URL 归一化断言：`node --experimental-strip-types scripts/site-url-smoke.ts`
 *
 * 分享卡的封面图带 crossorigin="anonymous"，必须保持同源；这里锁住
 * 「本站绝对 URL → 根相对路径、外链原样」的规则。
 */
import assert from 'node:assert/strict';

import { sameOriginPath } from '../src/lib/site-url.ts';

const cases: { name: string; run: () => void }[] = [
  {
    name: '本站绝对 URL 转成 path + query + hash',
    run: () => {
      assert.equal(
        sameOriginPath(
          'https://classygit.dev/images/cover.jpg?v=2#top',
          'https://classygit.dev'
        ),
        '/images/cover.jpg?v=2#top'
      );
    },
  },
  {
    name: '站内根路径原样返回',
    run: () => {
      assert.equal(
        sameOriginPath('/images/cover.jpg', 'https://classygit.pages.dev'),
        '/images/cover.jpg'
      );
    },
  },
  {
    name: '外链 / 协议相对地址 / 空值原样返回',
    run: () => {
      assert.equal(
        sameOriginPath('https://images.example.com/cover.jpg', 'https://classygit.dev'),
        'https://images.example.com/cover.jpg'
      );
      assert.equal(
        sameOriginPath('//images.example.com/cover.jpg', 'https://classygit.dev'),
        '//images.example.com/cover.jpg'
      );
      assert.equal(sameOriginPath(null, 'https://classygit.dev'), null);
      assert.equal(sameOriginPath(undefined, 'https://classygit.dev'), undefined);
    },
  },
  {
    name: '非法 URL 不抛错，原样返回',
    run: () => {
      assert.equal(sameOriginPath('https://', 'https://classygit.dev'), 'https://');
      assert.equal(sameOriginPath('cover.jpg', 'https://classygit.dev'), 'cover.jpg');
    },
  },
  {
    name: 'origin 带尾斜杠也能匹配',
    run: () => {
      assert.equal(
        sameOriginPath('https://classygit.dev/images/cover.jpg', 'https://classygit.dev/'),
        '/images/cover.jpg'
      );
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

assert.equal(failed, 0, `${failed} 条 site-url 断言失败`);
console.log(`site-url smoke ok (${cases.length} cases)`);
