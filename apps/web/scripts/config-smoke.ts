/**
 * 配置解析的断言测试：`node --experimental-strip-types scripts/config-smoke.ts`
 *
 * 这个文件不在 tsconfig 的 include 里，只作为可执行验证用。
 */
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, isConfigForUser, parseConfig } from '../src/lib/config.ts';
import { seoForProfile } from '../src/lib/seo.ts';
import { THEME_NAMES, parseThemeParam, resolveThemeChoice } from '../src/lib/theme.ts';
import { resolveRequestTheme } from '../src/lib/request-theme.ts';
import { userFromPath } from '../src/lib/user-route.ts';

type Case = { name: string; run: () => void | Promise<void> };

const cases: Case[] = [
  {
    name: '空配置 → 全部默认值，主页默认不索引',
    run: () => {
      const { config, issues } = parseConfig({});
      assert.deepEqual(issues, []);
      assert.equal(config.profile.repos.showCount, 6);
      assert.equal(config.profile.repos.visible, true);
      assert.equal(config.profile.gists.showCount, 6);
      assert.equal(config.profile.gists.visible, true);
      assert.equal(config.profile.contrib.visible, true);
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
      assert.equal(config.profile.gists.showCount, 6);
      assert.equal(config.seo.index, false);
    },
  },
  {
    name: 'cover / cardUrl 为 null 时 profile 不被整段丢弃',
    run: () => {
      const { config, issues } = parseConfig({
        profile: {
          cover: null,
          cardUrl: null,
          contrib: { visible: false },
          repos: { visible: true, showCount: 4 },
          gists: { visible: false, showCount: 2 },
        },
      });
      assert.equal(config.profile.repos.showCount, 4);
      assert.equal(config.profile.gists.visible, false);
      assert.equal(config.profile.gists.showCount, 2);
      assert.equal(config.profile.contrib.visible, false);
      assert.equal(config.profile.cover, null);
      assert.equal(config.profile.cardUrl, null);
      assert.deepEqual(issues, []);
    },
  },
  {
    name: '合法 cover 透传',
    run: () => {
      const { config } = parseConfig({
        profile: { cover: 'https://images.example.com/cover.jpg' },
      });
      assert.equal(
        config.profile.cover,
        'https://images.example.com/cover.jpg'
      );
    },
  },
  {
    name: 'cover 允许站内根路径，拒绝协议相对地址',
    run: () => {
      const local = parseConfig({ profile: { cover: '/images/cover.jpg' } });
      assert.equal(local.config.profile.cover, '/images/cover.jpg');

      const protocolRelative = parseConfig({
        profile: { cover: '//evil.example/cover.jpg' },
      });
      assert.equal(protocolRelative.config.profile.cover, null);
      assert.ok(
        protocolRelative.issues.some((issue) => issue.startsWith('profile:'))
      );
    },
  },
  {
    name: 'owner：合法值透传，非法值忽略',
    run: () => {
      assert.equal(parseConfig({ owner: 'demo' }).config.owner, 'demo');
      const invalid = parseConfig({ owner: 'not a login' });
      assert.equal(invalid.config.owner, null);
      assert.ok(invalid.issues.some((issue) => issue.startsWith('owner:')));

      // fork 继承作者配置时必须被识别为模板
      assert.equal(isConfigForUser({ owner: 'Dnevend' }, 'someone'), false);
      assert.equal(isConfigForUser({ owner: 'Dnevend' }, 'dnevend'), true);
      assert.equal(isConfigForUser({ owner: null }, 'someone'), true);
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
      assert.equal(parseConfig({ profile: { gists: { showCount: 9999 } } }).config.profile.gists.showCount, 100);
      assert.equal(parseConfig({ profile: { gists: { showCount: -5 } } }).config.profile.gists.showCount, 0);
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
    name: '非法 theme → 回退 mac 并记 issue',
    run: () => {
      const { config, issues } = parseConfig({ theme: 'amiga' });
      assert.equal(config.theme, 'mac');
      assert.ok(issues.some((issue) => issue.startsWith('theme:')));
    },
  },
  {
    name: '合法 theme 透传，win95 旧名归一为 win98',
    run: () => {
      assert.equal(parseConfig({ theme: 'win98' }).config.theme, 'win98');
      assert.equal(parseConfig({ theme: 'win95' }).config.theme, 'win98');
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
      assert.deepEqual([...THEME_NAMES], ['nes', 'mac', 'win98', 'tui']);
      assert.equal(parseThemeParam(undefined), 'mac');
      assert.equal(parseThemeParam(null), 'mac');
      assert.equal(parseThemeParam(''), 'mac');
      assert.equal(parseThemeParam('nes'), 'nes');
      assert.equal(parseThemeParam(' NES '), 'nes');
      assert.equal(parseThemeParam('amiga'), 'mac');
      assert.equal(parseThemeParam('win95'), 'win98');
      assert.equal(parseThemeParam('default'), 'mac');
    },
  },
  {
    name: '主题持久化：?theme= 优先，其次 cookie，最后站主默认主题 / mac',
    run: () => {
      // 显式选了主题 → 要写 cookie
      assert.deepEqual(resolveThemeChoice({ param: 'nes' }), { theme: 'nes', persist: true });
      assert.deepEqual(resolveThemeChoice({ param: 'default', cookie: 'nes' }), {
        theme: 'mac',
        persist: true,
      });
      // 没带参数 → 用 cookie，不重复写
      assert.deepEqual(resolveThemeChoice({ cookie: 'nes' }), { theme: 'nes', persist: false });
      // 都没有 / 都非法 → fallback，默认 mac
      assert.deepEqual(resolveThemeChoice({}), { theme: 'mac', persist: false });
      assert.deepEqual(resolveThemeChoice({ fallback: 'nes' }), {
        theme: 'nes',
        persist: false,
      });
      assert.deepEqual(resolveThemeChoice({ param: 'amiga', cookie: 'xx', fallback: 'nes' }), {
        theme: 'nes',
        persist: false,
      });
      // 参数非法时仍要尊重合法 cookie；旧名 win95 归一为 win98
      assert.deepEqual(resolveThemeChoice({ param: 'amiga', cookie: 'win95' }), {
        theme: 'win98',
        persist: false,
      });
      // 大小写
      assert.equal(resolveThemeChoice({ param: 'NES' }).theme, 'nes');
    },
  },
  {
    name: '默认主题：只有用户页需要读配置，静态/系统路径不读',
    run: () => {
      assert.equal(userFromPath('/Dnevend'), 'Dnevend');
      assert.equal(userFromPath('/Dnevend/'), 'Dnevend');
      assert.equal(userFromPath('/Dnevend/repos'), 'Dnevend');
      assert.equal(userFromPath('/Dnevend/gist/abc'), 'Dnevend');
      assert.equal(userFromPath('/Dnevend/repo/foo.svg'), 'Dnevend');
      assert.equal(userFromPath('/%44nevend'), 'Dnevend');

      for (const path of [
        '/',
        '/setup',
        '/webring',
        '/random',
        '/badge/Dnevend',
        '/og/Dnevend.png',
        '/api/hit/Dnevend',
        '/claim/Dnevend',
        '/contrib/Dnevend.json',
        '/card/Dnevend',
        '/images/cover.jpg',
        '/fonts/x.woff2',
        '/cursors/mac-arrow.svg',
        '/%73etup',
        '/robots.txt',
        '/sitemap/1.xml',
        '/Dnevend/rss.xml',
        '/not%20valid',
      ]) {
        assert.equal(userFromPath(path), null, path);
      }
    },
  },
  {
    name: 'middleware 主题接线：配置默认主题进入 fallback，显式选择不读配置',
    run: async () => {
      const calls: { login: string; fresh: boolean }[] = [];
      const load = async (login: string, fresh: boolean) => {
        calls.push({ login, fresh });
        return 'nes' as const;
      };

      // 无参数/无 cookie 的用户页 → 读配置，主题变 nes
      assert.deepEqual(
        await resolveRequestTheme({ pathname: '/Dnevend', loadConfigTheme: load }),
        { theme: 'nes', persist: false }
      );
      assert.deepEqual(calls, [{ login: 'Dnevend', fresh: false }]);

      // 显式 ?theme / cookie 不读配置
      calls.length = 0;
      assert.deepEqual(
        await resolveRequestTheme({
          pathname: '/Dnevend',
          param: 'win98',
          loadConfigTheme: load,
        }),
        { theme: 'win98', persist: true }
      );
      assert.deepEqual(
        await resolveRequestTheme({
          pathname: '/Dnevend',
          cookie: 'nes',
          loadConfigTheme: load,
        }),
        { theme: 'nes', persist: false }
      );
      assert.deepEqual(calls, []);

      // 非用户页不读配置
      assert.deepEqual(
        await resolveRequestTheme({ pathname: '/setup', loadConfigTheme: load }),
        { theme: 'mac', persist: false }
      );
      assert.deepEqual(
        await resolveRequestTheme({ pathname: '/%73etup', loadConfigTheme: load }),
        { theme: 'mac', persist: false }
      );
      assert.deepEqual(calls, []);

      // 非法参数时用配置默认主题
      assert.deepEqual(
        await resolveRequestTheme({
          pathname: '/Dnevend',
          param: 'amiga',
          loadConfigTheme: load,
        }),
        { theme: 'nes', persist: false }
      );
      assert.deepEqual(calls, [{ login: 'Dnevend', fresh: false }]);

      // 配置读取失败回退 mac
      assert.deepEqual(
        await resolveRequestTheme({
          pathname: '/Dnevend',
          loadConfigTheme: async () => {
            throw new Error('rate limited');
          },
        }),
        { theme: 'mac', persist: false }
      );

      // 预览时 fresh=true
      calls.length = 0;
      await resolveRequestTheme({
        pathname: '/Dnevend',
        fresh: true,
        loadConfigTheme: load,
      });
      assert.deepEqual(calls, [{ login: 'Dnevend', fresh: true }]);
    },
  },
  {
    name: 'SEO：只有站主默认主题可索引',
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

      const base = {
        user: 'demo',
        userinfo,
        origin: 'https://x.test',
        indexable: true,
      };

      // 默认主题（mac 接管 default）可以索引
      assert.equal(
        seoForProfile({ ...base, theme: 'mac', defaultTheme: 'mac' }).robots,
        'index, follow'
      );
      // 访客切到别的主题，即使 seo.index=true 也不索引
      assert.equal(
        seoForProfile({ ...base, theme: 'nes', defaultTheme: 'mac' }).robots,
        'noindex, follow'
      );
      // 站主自己选了 nes，则 nes 就是默认主题，可以索引
      assert.equal(
        seoForProfile({ ...base, theme: 'nes', defaultTheme: 'nes' }).robots,
        'index, follow'
      );
      // canonical 始终指回不带 theme 的干净地址
      assert.equal(
        seoForProfile({ ...base, theme: 'nes', defaultTheme: 'mac' }).canonical,
        'https://x.test/demo'
      );
      // OG 图跟随访客主题
      assert.equal(
        seoForProfile({ ...base, theme: 'mac', defaultTheme: 'mac' }).image,
        'https://x.test/og/demo.png?theme=mac&v=3'
      );
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
    await run();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`    ${(error as Error).message.split('\n')[0]}`);
  }
}

assert.equal(failed, 0, `${failed} 条配置断言失败`);
console.log(`config smoke ok (${cases.length} cases)`);
