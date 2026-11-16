const CJK = /[\u3400-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;

/**
 * 估算阅读时间：中文按 300 字/分钟，英文按 200 词/分钟，向上取整。
 * 代码块也按词数算，结果只是给读者的量级参考。
 */
export const estimateReadingMinutes = (text: string): number => {
  if (!text.trim()) return 0;

  const cjk = (text.match(CJK) ?? []).length;
  const latin = (text.replace(CJK, ' ').match(LATIN_WORD) ?? []).length;
  const minutes = cjk / 300 + latin / 200;

  return Math.max(1, Math.ceil(minutes));
};
