import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { unified } from 'unified';
import type { Element, Root, RootContent } from 'hast';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

import {
  isAbsoluteHref,
  rewriteRepoHref,
  type RepoLinkContext,
} from './repo-link.ts';

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

const CLOBBER_PREFIX = 'user-content-';

/**
 * sanitize 为了防 DOM clobbering 会给 id/name 加 `user-content-` 前缀，
 * 但 Markdown 里手写的 `<a name="install"></a>` 是常见锚点。
 * 只对 `<a>` 去掉前缀，其余元素继续保留前缀。
 */
const rehypeUnprefixAnchors = () => (tree: Root) => {
  walkElements(tree, (node) => {
    if (node.tagName !== 'a') return;

    const props = node.properties;
    if (!props) return;

    for (const key of ['id', 'name'] as const) {
      const value = props[key];
      if (typeof value === 'string' && value.startsWith(CLOBBER_PREFIX)) {
        props[key] = value.slice(CLOBBER_PREFIX.length);
      }
    }
  });
};

/**
 * 把 README 里的相对路径补成绝对地址，并给外链补上 target/rel。
 * GitHub 上 README 里的图片几乎都是相对路径，不处理就是一片碎图。
 *
 * 传入 `repo` 时，同仓库的相对链接会按文件在仓库中的位置解析：
 * `docs/issue-419.md` 指向站内文件页，而不是被浏览器解析成
 * `/{user}/repo/docs/issue-419.md` 后 404。
 */
const rehypeFixUrls =
  (base?: string, repo?: RepoLinkContext) => (tree: Root) => {
    walkElements(tree, (node) => {
      const props = node.properties ?? {};

      if (node.tagName === 'img' && typeof props.src === 'string') {
        const src = props.src;

        if (!isAbsoluteHref(src)) {
          // 根相对图片按 GitHub 语义从仓库根解析；普通相对图片按文件所在目录。
          if (src.startsWith('/') && repo) {
            const rawRoot = `https://raw.githubusercontent.com/${repo.login}/${repo.repo}/HEAD/`;
            props.src = new URL(src.replace(/^\/+/, ''), rawRoot).toString();
          } else if (base) {
            props.src = new URL(src.replace(/^\/+/, ''), base).toString();
          }
        }

        props.loading = 'lazy';
      }

      if (node.tagName === 'a' && typeof props.href === 'string') {
        const href = props.href;

        if (isAbsoluteHref(href)) {
          props.target = '_blank';
          props.rel = ['noopener', 'noreferrer'];
          return;
        }

        if (!repo) return;

        const rewritten = rewriteRepoHref(href, repo);
        if (!rewritten) return;

        props.href = rewritten.href;

        if (rewritten.external) {
          props.target = '_blank';
          props.rel = ['noopener', 'noreferrer'];
        }
      }
    });
  };

/**
 * 留言簿用的更严格 schema：禁止图片/嵌入，避免评论里的追踪像素。
 * 文本、链接、代码块照常保留。
 */
const commentAttributes = { ...(schema.attributes ?? {}) };
delete commentAttributes.img;
delete commentAttributes.picture;
delete commentAttributes.source;

const commentSchema: SanitizeSchema = {
  ...schema,
  tagNames: (schema.tagNames ?? []).filter(
    (tag) => !['img', 'picture', 'source', 'video', 'audio'].includes(tag)
  ),
  attributes: commentAttributes,
};

export interface RenderMarkdownOptions {
  /** 相对路径基准，通常来自 README 的 download_url 目录 */
  base?: string;
  /** 仓库上下文；提供后同仓库相对链接会改写成站内文件页 */
  repo?: RepoLinkContext;
  /** 留言簿等用户评论关掉图片，默认允许（README 需要） */
  allowImages?: boolean;
  /** 评论不跑 Shiki，避免一页几十条评论把 CPU 打满 */
  highlight?: boolean;
}

export async function renderMarkdown(
  source: string,
  options: RenderMarkdownOptions = {}
): Promise<string> {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, options.allowImages === false ? commentSchema : schema)
    // 标题 id 放在 sanitize 之后：生成的是我们自己的 slug，不能被 clobber 前缀改写；
    // 有 id 后 `#锚点` 才能跳到页内小节（GitHub 同名 heading 的 slug 规则一致）。
    .use(rehypeUnprefixAnchors)
    .use(rehypeSlug)
    .use(rehypeFixUrls, options.base, options.repo);

  if (options.highlight !== false) {
    const highlighter = await getHighlighter();
    pipeline.use(rehypeShikiFromHighlighter, highlighter, {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultLanguage: 'text',
      fallbackLanguage: 'text',
    });
  }

  const file = await pipeline.use(rehypeStringify).process(source);

  return String(file);
}
