import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { unified } from 'unified';
import type { Element, Root, RootContent } from 'hast';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

// 只注册真正需要的语言与主题。
// 用 `@shikijs/rehype` 的默认入口会把全部 ~200 种语法打进 Worker（实测 27MB），
// 换成 core + 显式 import 后体积降一个数量级。
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import diff from 'shiki/langs/diff.mjs';
import docker from 'shiki/langs/docker.mjs';
import go from 'shiki/langs/go.mjs';
import html from 'shiki/langs/html.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsonc from 'shiki/langs/jsonc.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import python from 'shiki/langs/python.mjs';
import rust from 'shiki/langs/rust.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import sql from 'shiki/langs/sql.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import vue from 'shiki/langs/vue.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

/**
 * GitHub README 是任意外部内容，管线顺序不能改：
 *
 *   remark-parse → remark-gfm → remark-rehype(允许原始 HTML)
 *   → rehype-raw（把 HTML 解析成节点）
 *   → rehype-sanitize（白名单过滤）
 *   → rehype-shiki（服务端高亮，产出的是我们自己的 HTML）
 *   → rehype-stringify
 *
 * 先 sanitize 后高亮：反过来的话 shiki 生成的 class/style 会被白名单清掉。
 */
const schema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details',
    'summary',
    'kbd',
    'picture',
    'source',
    'figure',
    'figcaption',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
    img: [...(defaultSchema.attributes?.img ?? []), 'width', 'height', 'align', 'loading'],
    p: [...(defaultSchema.attributes?.p ?? []), 'align'],
    div: [...(defaultSchema.attributes?.div ?? []), 'align'],
    source: ['srcset', 'srcSet', 'type', 'media'],
    code: [['className', /^language-./]],
    span: [['className']],
    details: [...(defaultSchema.attributes?.details ?? []), 'open'],
  },
};

let highlighterPromise: ReturnType<typeof createHighlighterCore> | undefined;

const getHighlighter = () => {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [
      bash,
      css,
      diff,
      docker,
      go,
      html,
      java,
      javascript,
      json,
      jsonc,
      jsx,
      markdown,
      python,
      rust,
      shellscript,
      sql,
      toml,
      tsx,
      typescript,
      vue,
      yaml,
    ],
    // 纯 JS 引擎，避免把 oniguruma wasm 打进 Worker
    engine: createJavaScriptRegexEngine(),
  });

  return highlighterPromise;
};

const isAbsolute = (value: string) =>
  /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');

const walkElements = (tree: Root, visit: (node: Element) => void) => {
  const walk = (node: Root | Element) => {
    if (node.type === 'element') visit(node);

    const children: RootContent[] = 'children' in node ? (node.children as RootContent[]) : [];
    for (const child of children) {
      if (child.type === 'element') walk(child);
    }
  };

  walk(tree);
};

/**
 * 把 README 里的相对路径补成绝对地址，并给外链补上 target/rel。
 * GitHub 上 README 里的图片几乎都是相对路径，不处理就是一片碎图。
 */
const rehypeFixUrls = (base?: string) => (tree: Root) => {
  walkElements(tree, (node) => {
    const props = node.properties ?? {};

    if (node.tagName === 'img' && typeof props.src === 'string') {
      const src = props.src;

      if (!isAbsolute(src) && base) {
        props.src = new URL(src.replace(/^\/+/, ''), base).toString();
      }

      props.loading = 'lazy';
    }

    if (node.tagName === 'a' && typeof props.href === 'string') {
      const href = props.href;

      if (isAbsolute(href)) {
        props.target = '_blank';
        props.rel = ['noopener', 'noreferrer'];
      }
    }
  });
};

export interface RenderMarkdownOptions {
  /** 相对路径基准，通常来自 README 的 download_url 目录 */
  base?: string;
}

export async function renderMarkdown(
  source: string,
  options: RenderMarkdownOptions = {}
): Promise<string> {
  const highlighter = await getHighlighter();

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(rehypeFixUrls, options.base)
    .use(rehypeShikiFromHighlighter, highlighter, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultLanguage: 'text',
      fallbackLanguage: 'text',
    })
    .use(rehypeStringify)
    .process(source);

  return String(file);
}
