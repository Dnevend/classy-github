import type { ParsedGistDescription } from './gist-rule.ts';

export interface TagCount {
  name: string;
  count: number;
}

/** 收集标签并按出现次数降序；大小写不敏感去重，展示第一次出现的大小写 */
export const collectTagCounts = (
  parsed: ParsedGistDescription[]
): TagCount[] => {
  const counts = new Map<string, TagCount>();

  for (const item of parsed) {
    for (const tag of item.tags) {
      const key = tag.toLowerCase();
      const existing = counts.get(key);

      if (existing) existing.count += 1;
      else counts.set(key, { name: tag, count: 1 });
    }
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
};

export const hasTag = (
  parsed: ParsedGistDescription,
  tag: string
): boolean => {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return true;
  return parsed.tags.some((item) => item.toLowerCase() === normalized);
};
