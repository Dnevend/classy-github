/**
 * P0 韧性改动的纯函数断言：
 * - AI 爬虫 UA 拦截
 * - robots.txt 规则
 * - preview 同源限制
 * - 仓库文件页只对已认领站点渲染
 *
 * 运行：node --experimental-strip-types scripts/p0-smoke.ts
 */
import assert from 'node:assert/strict';

import { AI_BOT_AGENTS, isAiBot } from '../src/lib/ai-bots.ts';
import { isPreviewRequest } from '../src/lib/preview.ts';
import {
  githubBlobUrl,
  shouldRedirectRepoPath,
} from '../src/lib/repo-access.ts';
import { buildRobotsTxt } from '../src/lib/robots.ts';
import { resetSingleFlight, singleFlight } from '../src/lib/single-flight.ts';

type Case = { name: string; run: () => void | Promise<void> };
const cases: Case[] = [];

cases.push({
  name: 'AI bot：识别主流训练 / 抓取 UA，不误伤搜索爬虫',
  run: () => {
    assert.equal(
      isAiBot('Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.2)'),
      true
    );
    assert.equal(isAiBot('ClaudeBot/1.0'), true);
    assert.equal(isAiBot('CCBot/2.0'), true);
    assert.equal(isAiBot('Bytespider'), true);
    assert.equal(isAiBot('PerplexityBot'), true);
    assert.equal(
      isAiBot('Mozilla/5.0 (compatible; Googlebot/2.1)'),
      false
    );
    assert.equal(isAiBot('Mozilla/5.0 (X11; Linux x86_64)'), false);
    assert.equal(isAiBot(null), false);
  },
});

cases.push({
  name: 'robots.txt：AI bot 全拦，仓库深路径和 preview 不参与抓取',
  run: () => {
    const robots = buildRobotsTxt('https://classygit.dev');

    for (const agent of AI_BOT_AGENTS) {
      assert.ok(
        robots.includes(`User-agent: ${agent}`),
        `robots.txt 缺少 ${agent}`
      );
    }

    assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
    assert.match(robots, /Disallow: \/\*\/repo\//);
    assert.match(robots, /Disallow: \/\*\?preview=1/);
    assert.match(robots, /Disallow: \/setup/);
    assert.match(robots, /Disallow: \/claim\//);
    assert.match(
      robots,
      /Sitemap: https:\/\/classygit\.dev\/sitemap\.xml/
    );
  },
});

cases.push({
  name: 'preview：只允许同源导航，直接访问 / 外链一律当普通请求',
  run: () => {
    const url = new URL('https://classygit.dev/Dnevend?preview=1');
    const request = (headers: Record<string, string>) =>
      new Request(url, { headers });

    assert.equal(
      isPreviewRequest(
        request({ 'sec-fetch-site': 'same-origin' }),
        url,
        'https://classygit.dev/'
      ),
      true
    );
    assert.equal(
      isPreviewRequest(
        request({ referer: 'https://classygit.dev/setup?u=Dnevend' }),
        url,
        'https://classygit.dev'
      ),
      true
    );

    // Pages 代理后面的 Worker 看到的是 workers.dev，Referer 仍是 pages.dev；
    // 这时用 x-forwarded-host 识别公开 origin，旧入口仍然可用。
    const proxiedUrl = new URL(
      'https://classy-web.dnevend.workers.dev/Dnevend?preview=1'
    );
    assert.equal(
      isPreviewRequest(
        new Request(proxiedUrl, {
          headers: {
            referer: 'https://classygit.pages.dev/setup?u=Dnevend',
            'x-forwarded-host': 'classygit.pages.dev',
            'x-forwarded-proto': 'https',
          },
        }),
        proxiedUrl,
        'https://classygit.dev'
      ),
      true
    );
    assert.equal(
      isPreviewRequest(
        request({ referer: 'https://evil.test/setup' }),
        url,
        'https://classygit.dev'
      ),
      false
    );
    assert.equal(
      isPreviewRequest(request({}), url, 'https://classygit.dev'),
      false
    );
    assert.equal(
      isPreviewRequest(
        request({ 'sec-fetch-site': 'same-origin' }),
        new URL('https://classygit.dev/Dnevend'),
        'https://classygit.dev'
      ),
      false
    );
  },
});

cases.push({
  name: '仓库文件页：未认领用户跳 GitHub，已认领 / 配置读取失败照常渲染',
  run: () => {
    assert.equal(
      shouldRedirectRepoPath({ configured: false, reliable: true }),
      true
    );
    assert.equal(
      shouldRedirectRepoPath({ configured: true, reliable: true }),
      false
    );
    assert.equal(
      shouldRedirectRepoPath({ configured: false, reliable: false }),
      false
    );

    assert.equal(
      githubBlobUrl('Dnevend', 'classy-github', 'src/a b.ts'),
      'https://github.com/Dnevend/classy-github/blob/HEAD/src/a%20b.ts'
    );
    assert.equal(
      githubBlobUrl('a b', 'x y', '文件.md'),
      'https://github.com/a%20b/x%20y/blob/HEAD/%E6%96%87%E4%BB%B6.md'
    );
  },
});

cases.push({
  name: 'single-flight：同一个 key 的并发冷请求只回源一次',
  run: async () => {
    resetSingleFlight();
    let calls = 0;

    const first = singleFlight('profile:Dnevend', async () => {
      calls += 1;
      await Promise.resolve();
      return 'first';
    });
    const second = singleFlight('profile:Dnevend', async () => {
      calls += 1;
      return 'second';
    });

    assert.equal(await first, 'first');
    assert.equal(await second, 'first');
    assert.equal(calls, 1);

    // 任务结束后 key 必须释放，下一次请求要重新执行。
    assert.equal(await singleFlight('profile:Dnevend', async () => 'third'), 'third');
    assert.equal(calls, 1);
  },
});

for (const testCase of cases) {
  await testCase.run();
  console.log(`  ✓ ${testCase.name}`);
}

console.log(`p0 smoke ok (${cases.length} cases)`);
