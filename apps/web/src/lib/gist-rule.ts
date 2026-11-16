/**
 * Gist 描述规则：`classy.<type>.<title>` + 可选 `#标签`
 *
 * 这是项目里最“零后端”的一处设计——用 Gist 的描述充当分类、标题和标签。
 * 解析必须容忍：前后空格、大小写差异、不同类型分隔符、中文标签。
 */
export interface GistRule {
  prefix: string;
  split: string;
}

export const DEFAULT_GIST_RULE: GistRule = { prefix: 'classy', split: '.' };

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 标签最多 8 个，每个 1–32 字符；`#` 前必须是开头或空白，避免误伤 `C#教程` */
const TAG_PATTERN = /(^|\s)#([\p{L}\p{N}_-]{1,32})/gu;
const MAX_TAGS = 8;

export interface ParsedGistDescription {
  /** 分类名，未匹配规则时为 undefined */
  type?: string;
  /** 展示用标题（已去掉 #标签） */
  title: string;
  /** 从描述里提取的标签，保留原始大小写，去重 */
  tags: string[];
}

const extractTags = (value: string): { title: string; tags: string[] } => {
  const tags: string[] = [];
  const seen = new Set<string>();

  const title = value
    .replace(TAG_PATTERN, (match, prefix: string, rawTag: string) => {
      const key = rawTag.toLowerCase();

      // 超出上限或重复的标签从标题里剥掉，但不再加入 tags
      if (seen.has(key) || tags.length >= MAX_TAGS) return prefix;

      seen.add(key);
      tags.push(rawTag);
      return prefix;
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { title, tags };
};

export const createGistDescriptionParser = (
  rule: GistRule = DEFAULT_GIST_RULE
) => {
  const { prefix, split } = rule;
  const pattern = new RegExp(
    `^${escapeRegExp(prefix)}${escapeRegExp(split)}([a-zA-Z]+)${escapeRegExp(split)}(.+)$`,
    'i'
  );

  return (description?: string | null): ParsedGistDescription => {
    const raw = description?.trim() ?? '';
    if (!raw) return { title: '', tags: [] };

    const match = pattern.exec(raw);
    if (!match) return extractTags(raw);

    const parsed = extractTags(match[2]);
    return { type: match[1].toLowerCase(), ...parsed };
  };
};
