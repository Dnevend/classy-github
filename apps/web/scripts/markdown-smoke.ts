/**
 * Markdown 管线的冒烟测试：`node --experimental-strip-types scripts/markdown-smoke.ts`
 *
 * 这个文件不在 tsconfig 的 include 里（见 tsconfig.json 的 exclude），
 * 只作为可执行验证用，不参与 astro check。
 */
import assert from 'node:assert/strict';

import { renderMarkdown } from '../src/lib/markdown.ts';

const source = [
  '# 标题',
  '',
  '一段正文，带 `inline code`。',
  '',
  '```ts',
  'const answer: number = 42;',
  '```',
  '',
  '| 列一 | 列二 |',
  '| ---- | ---- |',
  '| 1    | 2    |',
  '',
  '<img src="demo.png" alt="相对路径图片">',
  '<img src="https://evil.example/x.png" onerror="alert(1)">',
  '<script>alert("xss")</script>',
  '<iframe src="https://evil.example"></iframe>',
  '',
  '[危险链接](javascript:alert(3))',
  '[正常链接](https://github.com/Dnevend/classy-github)',
].join('\n');

const base = 'https://raw.githubusercontent.com/someone/someone/main/';
const html = await renderMarkdown(source, { base });

const checks: Record<string, boolean> = {
  // 功能
  heading: html.includes('<h1>'),
  codeHighlighted: html.includes('class="shiki'),
  table: html.includes('<table'),
  inlineCode: html.includes('<code>'),
  // 相对路径重写
  relativeImage: html.includes(`${base}demo.png`),
  // 外链加固
  externalRel: /rel="noopener noreferrer"/.test(html),
  externalTarget: /target="_blank"/.test(html),
  // 安全：这四条任意一条为 true 就是漏洞
  stripsScript: !/<script/i.test(html),
  stripsOnerror: !/onerror/i.test(html),
  stripsIframe: !/<iframe/i.test(html),
  stripsJavascriptHref: !/javascript:/i.test(html),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

assert.deepEqual(failed, [], `markdown 管线断言失败: ${failed.join(', ')}`);

console.log('markdown smoke ok');
for (const [name, ok] of Object.entries(checks)) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
