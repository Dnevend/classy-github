/**
 * 配置解析的断言测试：`node --experimental-strip-types scripts/config-smoke.ts`
 *
 * 这个文件不在 tsconfig 的 include 里，只作为可执行验证用。
 */
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, parseConfig } from '../src/lib/config.ts';
import { seoForProfile } from '../src/lib/seo.ts';
import { THEME_NAMES, parseThemeParam } from '../src/lib/theme.ts';

type Case = { name: string; run: () => void };

const cases: Case[] = [
  {
    name: '空配置 → 全部默认值，主页默认不索引',
    run: () => {
      const { config, issues } = parseConfig({});
      assert.deepEqual(issues, []);
      assert.equal(config.profile.repos.showCount, 6);
      assert.equal(config.profile.repos.visible, true);
      assert.equal(config.seo.index, false);
      assert.deepEqual(config.links, []);
      assert.equal(config.gists.prefix, 'classy');
    },
  },
  {
    name: 'null / undefined 输入不崩',
    run: () => {
      assert.deepEqual(parseConfig(null).config, DEFAULT_CONFIG);
      assert.deepEqual(parseConfig(undefined).config, DEFAULT_CONFIG);
    },
  },
  {
    name: '只写一段 → 其余保持默认',
    run: () => {
      const { config } = parseConfig({ profile: { repos: { showCount: 3 } } });
      assert.equal(config.profile.repos.showCount, 3);
      assert.equal(config.profile.repos.visible, true);
      assert.equal(config.profile.showFollowers, true);
      assert.equal(config.seo.index, false);
    },
  },
  {
    name: 'seo.index: true 生效',
    run: () => {
      assert.equal(parseConfig({ seo: { index: true } }).config.seo.index, true);
    },
  },
  {
    name: 'javascript: 链接被丢弃，合法链接保留',
    run: () => {
      const { config, issues } = parseConfig({
        links: [
          { title: 'ok', href: 'https://example.com' },
          { title: 'xss', href: 'javascript:alert(1)' },
          { title: 'relative', href: '/etc/passwd' },
          { title: 'no href' },
        ],
      });
      assert.deepEqual(config.links, [{ title: 'ok', href: 'https://example.com' }]);
      assert.equal(issues.length, 3);
    },
  },
  {
    name: '未知字段被丢弃',
    run: () => {
      const { config } = parseConfig({ theme: 'default', 恶意字段: { a: 1 } });
      assert.equal('恶意字段' in config, false);
    },
  },
  {
    name: '越界的 showCount 被夹紧，而不是整段作废',
    run: () => {
      assert.equal(parseConfig({ profile: { repos: { showCount: 9999 } } }).config.profile.repos.showCount, 100);
      assert.equal(parseConfig({ profile: { repos: { showCount: -5 } } }).config.profile.repos.showCount, 0);
      assert.equal(parseConfig({ profile: { repos: { showCount: 2.7 } } }).config.profile.repos.showCount, 2);
      // 同段里的其它字段仍然生效
      const { config } = parseConfig({
        profile: { repos: { showCount: 9999, visible: false } },
      });
      assert.equal(config.profile.repos.visible, false);
    },
  },
  {
    name: '某段结构错误 → 只回退那一段',
    run: () => {
      const { config, issues } = parseConfig({
        profile: 'oops',
        links: [{ title: 'k', href: 'https://a.b' }],
      });
      assert.equal(config.profile.repos.showCount, 6);
      assert.equal(config.links.length, 1);
      assert.ok(issues.some((issue) => issue.startsWith('profile:')));
    },
  },
  {
    name: '非法 theme → 回退 default 并记 issue',
    run: () => {
      const { config, issues } = parseConfig({ theme: 'amiga' });
      assert.equal(config.theme, 'default');
      assert.ok(issues.some((issue) => issue.startsWith('theme:')));
    },
  },
  {
    name: '合法 theme 透传',
    run: () => {
      assert.equal(parseConfig({ theme: 'win95' }).config.theme, 'win95');
    },
  },
  {
    name: 'seo.index 贯通到 robots meta',
    run: () => {
      const userinfo = {
        login: 'demo',
        name: 'Demo',
        bio: '',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
        html_url: 'https://github.com/demo',
        company: '',
        public_repos: 1,
        public_gists: 0,
      } as never;

      const off = seoForProfile({ user: 'demo', userinfo, origin: 'https://x.test' });
      assert.equal(off.robots, 'noindex, follow');

      const { config } = parseConfig({ seo: { index: true } });
      const on = seoForProfile({
        user: 'demo',
        userinfo,
        origin: 'https://x.test',
        indexable: config.seo.index,
      });
      assert.equal(on.robots, 'index, follow');
    },
  },
  {
    name: '?theme= 解析：大小写/非法值/null',
    run: () => {
      assert.deepEqual([...THEME_NAMES], ['default', 'nes', 'mac', 'win95']);
      assert.equal(parseThemeParam(undefined), 'default');
      assert.equal(parseThemeParam(null), 'default');
      assert.equal(parseThemeParam(''), 'default');
      assert.equal(parseThemeParam('nes'), 'nes');
      assert.equal(parseThemeParam(' NES '), 'nes');
      assert.equal(parseThemeParam('amiga'), 'default');
      assert.equal(parseThemeParam('win95'), 'win95');
    },
  },
  {
    name: '非默认主题永不索引（即使 seo.index=true）',
    run: () => {
      const userinfo = {
        login: 'demo',
        name: 'Demo',
        bio: '',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
        html_url: 'https://github.com/demo',
        company: '',
        public_repos: 1,
        public_gists: 0,
      } as never;

      const seo = seoForProfile({
        user: 'demo',
        userinfo,
        origin: 'https://x.test',
        indexable: true,
        theme: 'nes',
      });
      assert.equal(seo.robots, 'noindex, follow');
      // canonical 始终指回不带 theme 的干净地址
      assert.equal(seo.canonical, 'https://x.test/demo');
    },
  },
  {
    name: 'gist 规则可覆盖，且特殊字符不会炸正则',
    run: () => {
      const { config } = parseConfig({ gists: { prefix: 'c(s', split: '|' } });
      assert.equal(config.gists.prefix, 'c(s');
      assert.equal(config.gists.split, '|');
      // 解析器自己负责转义，这里只确认配置层不拒绝
      assert.equal(parseConfig({ gists: { prefix: 'a.b' } }).config.gists.prefix, 'a.b');
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

assert.equal(failed, 0, `${failed} 条配置断言失败`);
console.log(`config smoke ok (${cases.length} cases)`);
