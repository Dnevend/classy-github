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

// 仓库文件页：README 里的相对链接要按文件在仓库中的位置解析
const repoSource = [
  '[同级文件](issue-419.md)',
  '[带锚点](issue-419.md#section)',
  '[上一级](../README.md)',
  '[根相对](/docs/issue-419.md)',
  '[图片资源](../images/logo.png)',
  '![根相对图片](/assets/root.png)',
  '![同目录图片](images/rel.png)',
  '[逃出仓库](../../outside.md)',
  '[锚点](#top)',
  '[外链](https://example.com/x)',
  '[危险](javascript:alert(4))',
].join('\n\n');

const base = 'https://raw.githubusercontent.com/someone/someone/main/';
const html = await renderMarkdown(source, { base });
const repoHtml = await renderMarkdown(repoSource, {
  base: 'https://raw.githubusercontent.com/someone/weekly/main/docs/',
  repo: { login: 'someone', repo: 'weekly', path: 'docs/README.md' },
});
const slugHtml = await renderMarkdown(
  [
    '[跳到小节](#section-one)',
    '## 为什么是 ClassyGit',
    '## 为什么是 ClassyGit',
    '## Section One',
  ].join('\n\n')
);
const explicitAnchorHtml = await renderMarkdown(
  '<a name="install"></a>\n\n## 安装\n\n[去安装](#install)'
);
const commentHtml = await renderMarkdown(
  '**签名** [主页](https://example.com)\n\n![tracking](https://evil.example/pixel.png)',
  { allowImages: false }
);

// GitHub 主题变体图片：#gh-*-mode-only 与 <picture> 按站点主题的亮/暗取舍
const themeSource = [
  '<img src="light.svg#gh-light-mode-only" alt="light">',
  '<img src="dark.svg#gh-dark-mode-only" alt="dark">',
  '',
  '<picture>',
  '  <source media="(prefers-color-scheme: dark)" srcset="./banner-dark.svg">',
  '  <source media="(prefers-color-scheme: light)" srcset="./banner-light.svg 1x">',
  '  <img src="./banner.png" alt="banner" width="100%">',
  '</picture>',
  '',
  '<a href="/hidden-link"><img src="linked-dark.svg#gh-dark-mode-only" alt="linked"></a>',
].join('\n');
const lightThemeHtml = await renderMarkdown(themeSource, { base, colorScheme: 'light' });
const darkThemeHtml = await renderMarkdown(themeSource, { base, colorScheme: 'dark' });
const fallbackPictureHtml = await renderMarkdown(
  '<picture><source media="(prefers-color-scheme: dark)" srcset="./only-dark.svg"><img src="./fallback.png" alt="fallback"></picture>',
  { base, colorScheme: 'light' }
);
const responsivePictureHtml = await renderMarkdown(
  '<picture><source media="(min-width: 600px)" srcset="./wide.png"><img src="./narrow.png" alt="narrow"></picture>',
  { base }
);
const responsiveThemeImgHtml = await renderMarkdown(
  '<picture><source media="(min-width: 600px)" srcset="./wide.png"><img src="./inner-dark.svg#gh-dark-mode-only" alt="inner"></picture>',
  { base, colorScheme: 'light' }
);
const responsiveThemeImgDarkHtml = await renderMarkdown(
  '<picture><source media="(min-width: 600px)" srcset="./wide.png"><img src="./inner-dark.svg#gh-dark-mode-only" alt="inner"></picture>',
  { base, colorScheme: 'dark' }
);
const emptyPictureHtml = await renderMarkdown(
  '<picture><source media="(prefers-color-scheme: dark)" srcset="./only-dark.svg"></picture>',
  { base, colorScheme: 'light' }
);
const unsafePictureHtml = await renderMarkdown(
  '<picture><source media="(prefers-color-scheme: light)" srcset="javascript:alert(1)"><img src="./safe.png" alt="safe"></picture>',
  { base, colorScheme: 'light' }
);
const unsafeSchemeUrls = ['javascript:alert(2)', 'vbscript:msgbox(1)', 'file:///etc/passwd'];
const unsafeSchemeHtml = await Promise.all(
  unsafeSchemeUrls.map((url, index) =>
    renderMarkdown(
      `<picture><source media="(prefers-color-scheme: light)" srcset="${url}"><img src="./safe-${index}.png" alt="safe"></picture>`,
      { base, colorScheme: 'light' }
    )
  )
);

const checks: Record<string, boolean> = {
  // 功能
  heading: /<h1[ >]/.test(html),
  codeHighlighted: html.includes('class="shiki'),
  table: html.includes('<table'),
  inlineCode: html.includes('<code>'),
  // 标题锚点：与 GitHub 相同的 slug，重复标题自动加后缀
  headingAnchor: slugHtml.includes('id="为什么是-classygit"'),
  headingAnchorDuplicate: slugHtml.includes('id="为什么是-classygit-1"'),
  headingAnchorLink:
    slugHtml.includes('href="#section-one"') &&
    slugHtml.includes('id="section-one"'),
  explicitAnchor: explicitAnchorHtml.includes('<a name="install"></a>'),
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
  // 留言簿模式：保留文字/链接，剥掉图片（防追踪像素）
  commentKeepsText: /<strong>/.test(commentHtml) && /<a /.test(commentHtml),
  commentStripsImages: !/<img/i.test(commentHtml),
  // 仓库内相对链接：Markdown / 目录留在站内，静态资源走 raw
  repoRelative:
    repoHtml.includes('href="/someone/repo/weekly/docs/issue-419.md"'),
  repoAnchor:
    repoHtml.includes('href="/someone/repo/weekly/docs/issue-419.md#section"'),
  repoParent: repoHtml.includes('href="/someone/repo/weekly/README.md"'),
  repoRootRelative:
    repoHtml.includes('href="/someone/repo/weekly/docs/issue-419.md"'),
  repoAsset:
    repoHtml.includes(
      'href="https://raw.githubusercontent.com/someone/weekly/HEAD/images/logo.png"'
    ),
  repoRootImage:
    repoHtml.includes(
      'src="https://raw.githubusercontent.com/someone/weekly/HEAD/assets/root.png"'
    ),
  repoRelativeImage: repoHtml.includes(
    'src="https://raw.githubusercontent.com/someone/weekly/main/docs/images/rel.png"'
  ),
  repoEscapeUntouched: repoHtml.includes('href="../../outside.md"'),
  repoAnchorUntouched: repoHtml.includes('href="#top"'),
  repoStripsJavascript: !/javascript:/i.test(repoHtml),
  // GitHub 主题变体图片：只留与当前主题配色一致的一版
  themeLightPicksLight:
    lightThemeHtml.includes(`${base}light.svg`) &&
    !lightThemeHtml.includes(`${base}dark.svg`),
  themeLightDropsDark:
    !lightThemeHtml.includes('#gh-light-mode-only') &&
    !lightThemeHtml.includes('#gh-dark-mode-only'),
  themeDarkPicksDark:
    darkThemeHtml.includes(`${base}dark.svg`) &&
    !darkThemeHtml.includes(`${base}light.svg`),
  themeLightPicture:
    lightThemeHtml.includes(`${base}banner-light.svg`) &&
    !lightThemeHtml.includes(`${base}banner-dark.svg`) &&
    !lightThemeHtml.includes('<picture'),
  themeDarkPicture:
    darkThemeHtml.includes(`${base}banner-dark.svg`) &&
    !darkThemeHtml.includes(`${base}banner-light.svg`) &&
    !darkThemeHtml.includes('<picture'),
  themePictureFallback:
    fallbackPictureHtml.includes(`${base}fallback.png`) &&
    !fallbackPictureHtml.includes('only-dark.svg'),
  themePictureUnrelatedUntouched:
    responsivePictureHtml.includes('<picture') &&
    responsivePictureHtml.includes('srcset="./wide.png"'),
  themeResponsivePictureImgFragment:
    !responsiveThemeImgHtml.includes('inner-dark.svg') &&
    !responsiveThemeImgHtml.includes('gh-dark-mode-only') &&
    responsiveThemeImgDarkHtml.includes(`${base}inner-dark.svg`) &&
    !responsiveThemeImgDarkHtml.includes('gh-dark-mode-only'),
  themeEmptyPictureRemoved:
    !emptyPictureHtml.includes('<picture') && !emptyPictureHtml.includes('only-dark.svg'),
  themePictureRejectsUnsafeSrcset:
    unsafePictureHtml.includes(`${base}safe.png`) &&
    !/javascript:/i.test(unsafePictureHtml),
  themePictureRejectsUnsafeProtocols: unsafeSchemeHtml.every(
    (out, index) =>
      out.includes(`${base}safe-${index}.png`) &&
      !/(?:javascript|vbscript|file):/i.test(out)
  ),
  themeDropsEmptyAnchor: !lightThemeHtml.includes('href="/hidden-link"'),
};


const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

assert.deepEqual(failed, [], `markdown 管线断言失败: ${failed.join(', ')}`);

console.log('markdown smoke ok');
for (const [name, ok] of Object.entries(checks)) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
