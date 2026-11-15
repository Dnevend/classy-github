/**
 * Gist 描述规则：`classy.<type>.<title>`
 *
 * 这是项目里最“零后端”的一处设计——用 Gist 的描述充当分类和标题，
 * 因此解析必须容忍：前后空格、大小写差异、不同类型分隔符。
 */
export interface GistRule {
  prefix: string;
  split: string;
}

export const DEFAULT_GIST_RULE: GistRule = { prefix: 'classy', split: '.' };

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface ParsedGistDescription {
  /** 分类名，未匹配规则时为 undefined */
  type?: string;
  /** 展示用标题 */
  title: string;
}

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
    if (!raw) return { title: '' };

    const match = pattern.exec(raw);
    if (!match) return { title: raw };

    return { type: match[1].toLowerCase(), title: match[2].trim() };
  };
};
