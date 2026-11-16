/**
 * 社区功能的纯函数 / 注册表断言。
 * 运行：node --experimental-strip-types scripts/community-smoke.ts
 */
import assert from 'node:assert/strict';

import { renderBadgeSvg } from '../src/lib/badge.ts';
import { DEFAULT_CONFIG, parseConfig } from '../src/lib/config.ts';
import { buildDefaultReadme } from '../src/lib/default-readme.ts';
import { buildAtomFeed } from '../src/lib/feed.ts';
import { createGistDescriptionParser } from '../src/lib/gist-rule.ts';
import { isBotRequest } from '../src/lib/hit-counter.ts';
import { localeFromAcceptLanguage } from '../src/lib/i18n.ts';
import { estimateReadingMinutes } from '../src/lib/reading.ts';
import { collectTagCounts, hasTag } from '../src/lib/tags.ts';
import {
  DISCOVER_PREFIX,
  RING_PREFIX,
  listSites,
  removeSite,
  syncSite,
} from '../src/lib/site-registry.ts';
import { pickNeighbors } from '../src/lib/webring.ts';
import type { UsersKv } from '../src/lib/users-kv.ts';

class MemoryKv implements UsersKv {
  readonly map = new Map<string, string>();

  async get(key: string) {
    return this.map.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.map.set(key, value);
  }

  async delete(key: string) {
    this.map.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
    const prefix = options?.prefix ?? '';
    const limit = options?.limit ?? 1000;
    const start = Number(options?.cursor ?? 0);
    const keys = [...this.map.keys()].filter((key) => key.startsWith(prefix)).sort();
    const slice = keys.slice(start, start + limit);

    return {
      keys: slice.map((name) => ({ name })),
      list_complete: start + limit >= keys.length,
      cursor: String(start + limit),
    };
  }
}

type Case = { name: string; run: () => void | Promise<void> };

const cases: Case[] = [
  {
    name: '社区配置：webring/discover 默认开启，guestbook 默认关闭',
    run: () => {
      const { config } = parseConfig({});
      assert.equal(config.guestbook.gistId, null);
      assert.equal(config.webring.enabled, true);
      assert.equal(config.discover.enabled, true);

      const off = parseConfig({
        webring: { enabled: false },
        discover: { enabled: false },
      });
      assert.equal(off.config.webring.enabled, false);
      assert.equal(off.config.discover.enabled, false);
    },
  },
  {
    name: '社区配置：合法值透传',
    run: () => {
      const gistId = 'a'.repeat(32);
      const { config, issues } = parseConfig({
        guestbook: { gistId },
        webring: { enabled: true },
        discover: { enabled: true },
      });
      assert.equal(config.guestbook.gistId, gistId);
      assert.equal(config.webring.enabled, true);
      assert.equal(config.discover.enabled, true);
      assert.deepEqual(issues, []);
    },
  },
  {
    name: '社区配置：非法 gistId 只丢这一段',
    run: () => {
      const { config, issues } = parseConfig({
        guestbook: { gistId: 'not-a-gist' },
        webring: { enabled: true },
      });
      assert.equal(config.guestbook.gistId, null);
      assert.equal(config.webring.enabled, true);
      assert.ok(issues.some((issue) => issue.startsWith('guestbook:')));
    },
  },
  {
    name: '首页语言：Accept-Language 只影响首页',
    run: () => {
      assert.equal(localeFromAcceptLanguage('zh-CN,zh;q=0.9'), 'zh');
      assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9'), 'en');
      assert.equal(localeFromAcceptLanguage('fr-FR,zh;q=0.8'), 'zh');
      assert.equal(localeFromAcceptLanguage(null), 'en');
    },
  },
  {
    name: '默认 README：占位符替换、中文模板',
    run: () => {
      const en = buildDefaultReadme({
        user: 'demo',
        display: 'Demo & Co',
        locale: 'en',
      });
      assert.match(en, /Demo & Co/);
      assert.match(en, /\/demo\/repos/);
      assert.match(en, /\/setup\?u=demo/);
      assert.equal(en.includes('{{'), false);

      const zh = buildDefaultReadme({
        user: 'demo',
        display: '演示用户',
        locale: 'zh',
      });
      assert.match(zh, /你好，我是/);
      assert.match(zh, /演示用户/);
      assert.equal(zh.includes('{{'), false);
    },
  },
  {
    name: 'Gist 标签：提取、去重、C# 不误伤',
    run: () => {
      const parse = createGistDescriptionParser();
      const parsed = parse('classy.blog.Hello #AI #长文 #ai');
      assert.equal(parsed.type, 'blog');
      assert.equal(parsed.title, 'Hello');
      assert.deepEqual(parsed.tags, ['AI', '长文']);

      const sharp = parse('classy.code.C#教程');
      assert.equal(sharp.title, 'C#教程');
      assert.deepEqual(sharp.tags, []);

      const plain = parse('随手记 #js');
      assert.equal(plain.title, '随手记');
      assert.deepEqual(plain.tags, ['js']);
    },
  },
  {
    name: '标签统计与筛选',
    run: () => {
      const parse = createGistDescriptionParser();
      const parsed = [
        parse('classy.blog.A #AI #js'),
        parse('classy.blog.B #ai'),
        parse('classy.blog.C #js'),
      ];

      const counts = collectTagCounts(parsed);
      assert.equal(counts[0]?.name.toLowerCase(), 'ai');
      assert.equal(counts[0]?.count, 2);
      assert.equal(counts.find((tag) => tag.name === 'js')?.count, 2);
      assert.equal(hasTag(parsed[0], 'AI'), true);
      assert.equal(hasTag(parsed[0], 'rust'), false);
    },
  },
  {
    name: '阅读时间：中英混排与空内容',
    run: () => {
      assert.equal(estimateReadingMinutes(''), 0);
      assert.equal(estimateReadingMinutes('hello world'), 1);
      assert.equal(estimateReadingMinutes('中'.repeat(600)), 2);
      assert.equal(estimateReadingMinutes('word '.repeat(400)), 2);
    },
  },
  {
    name: 'Atom feed：排序、转义、分类',
    run: () => {
      const userinfo = {
        login: 'demo',
        name: 'Demo & Co',
        bio: '',
        avatar_url: '',
        html_url: 'https://github.com/demo',
        public_repos: 1,
        public_gists: 2,
      } as never;
      const gists = [
        {
          id: 'a',
          description: 'classy.blog.First #archive',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          files: { 'a.md': { filename: 'a.md' } },
        },
        {
          id: 'b',
          description: 'classy.blog.Second & <tag> #AI #archive',
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
          files: { 'b.md': { filename: 'b.md' } },
        },
      ] as never;

      const xml = buildAtomFeed({
        user: 'demo',
        userinfo,
        gists,
        origin: 'https://x.test',
        config: DEFAULT_CONFIG,
        locale: 'en',
      });

      assert.match(xml, /^<\?xml/);
      assert.match(xml, /application\/atom\+xml/);
      assert.match(xml, /Second &amp; &lt;tag&gt;/);
      assert.match(xml, /<category term="blog"\/>/);
      assert.match(xml, /<category term="AI"\/>/);
      assert.equal((xml.match(/<category term="archive"\/>/g) ?? []).length, 2);
      assert.ok(xml.indexOf('Second') < xml.indexOf('First'));
    },
  },
  {
    name: '88×31 徽章：尺寸、主题色、转义',
    run: () => {
      const svg = renderBadgeSvg('Dnevend', 'nes');
      assert.match(svg, /width="88" height="31"/);
      assert.match(svg, /#212529/);
      assert.match(svg, /@Dnevend/);
      assert.match(renderBadgeSvg('<x>', 'mac'), /&lt;x&gt;/);
      assert.match(renderBadgeSvg('a'.repeat(20), 'mac'), /…/);
    },
  },
  {
    name: '计数器：bot / 预取只读',
    run: () => {
      const bot = new Request('https://x.test', {
        headers: { 'user-agent': 'TestBot/1.0' },
      });
      const browser = new Request('https://x.test', {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh)' },
      });
      const prefetch = new Request('https://x.test', {
        headers: { purpose: 'prefetch' },
      });

      assert.equal(isBotRequest(bot), true);
      assert.equal(isBotRequest(browser), false);
      assert.equal(isBotRequest(prefetch), true);
    },
  },
  {
    name: '网站环：上一站 / 下一站 / 随机',
    run: () => {
      const sites = [
        { login: 'alice', title: 'Alice', theme: 'mac', webring: true, discover: true, configuredAt: 1, updatedAt: 1 },
        { login: 'bob', title: 'Bob', theme: 'nes', webring: true, discover: true, configuredAt: 1, updatedAt: 1 },
        { login: 'carol', title: 'Carol', theme: 'tui', webring: true, discover: true, configuredAt: 1, updatedAt: 1 },
      ] as const;

      const bob = pickNeighbors([...sites], 'bob', 0);
      assert.equal(bob.member, true);
      assert.equal(bob.prev?.login, 'alice');
      assert.equal(bob.next?.login, 'carol');

      // 随机到自己时顺延，不能给出自己
      const alice = pickNeighbors([...sites], 'alice', 0);
      assert.equal(alice.random?.login, 'bob');

      const missing = pickNeighbors([...sites], 'nobody', 0);
      assert.equal(missing.member, false);
      assert.equal(missing.count, 3);

      const solo = pickNeighbors([sites[0]], 'alice', 0);
      assert.equal(solo.member, true);
      assert.equal(solo.prev, undefined);
    },
  },
  {
    name: '站点注册表：加入 / 列表 / 退出',
    run: async () => {
      const kv = new MemoryKv();

      await syncSite(kv, {
        login: 'Dnevend',
        title: 'Dnevend',
        theme: 'mac',
        webring: true,
        discover: true,
      });

      assert.equal(kv.map.size, 3);
      assert.equal((await listSites(kv, RING_PREFIX)).length, 1);
      assert.equal((await listSites(kv, DISCOVER_PREFIX)).length, 1);

      await syncSite(kv, {
        login: 'Dnevend',
        title: 'Dnevend',
        theme: 'mac',
        webring: false,
        discover: false,
      });

      assert.equal(await kv.get(`ring:dnevend`), null);
      assert.equal(await kv.get(`discover:dnevend`), null);

      await removeSite(kv, 'Dnevend');
      assert.equal(kv.map.size, 0);
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

assert.equal(failed, 0, `${failed} 条社区断言失败`);
console.log(`community smoke ok (${cases.length} cases)`);
