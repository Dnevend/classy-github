import en from '../templates/profile-readme.en.ts';
import zh from '../templates/profile-readme.zh.ts';
import type { Locale } from './i18n.ts';

const escapeMarkdown = (value: string) =>
  value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');

export interface DefaultReadmeOptions {
  user: string;
  display: string;
  locale: Locale;
}

/**
 * 用户没有 GitHub profile README 时显示的模板。
 * 模板文件在 src/templates/，这里只做占位符替换和 Markdown 转义。
 */
export const buildDefaultReadme = ({
  user,
  display,
  locale,
}: DefaultReadmeOptions): string => {
  const template = locale === 'zh' ? zh : en;
  const login = user.replace(/[^\w-]/g, '');
  const name = escapeMarkdown(display || user);

  return template
    .replaceAll('{{name}}', name)
    .replaceAll('{{login}}', login)
    .replaceAll('{{repos}}', `/${encodeURIComponent(login)}/repos`)
    .replaceAll('{{gists}}', `/${encodeURIComponent(login)}/gists`)
    .replaceAll('{{setup}}', `/setup?u=${encodeURIComponent(login)}`);
};
