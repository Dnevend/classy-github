import { Theme } from "../theme";

export const repoName = "classy-github";

export const repoUrl = "https://github.com/dnevend/classy-github";

export const userConfigFile = "classy.config.json";

export const githubUrl = {
  api: "https://api.github.com",

  gists: `https://gist.github.com`,

  raw: "https://raw.githubusercontent.com",

  new: "https://github.com/new",
};

/**
 * 只有实际部署了的主题才列在这里。
 * 未列出的主题不会出现在主题选择器里，`redirectTheme` 也会直接忽略，
 * 避免把用户跳到不存在的域名（历史问题：win95/mac 子域从未部署）。
 *
 * 重构后主题改为 `?theme=` 维度，本表随之废弃（见 specs/astro-migration/）。
 */
export const themeDomains: Partial<Record<Theme, string>> = {
  default: "classy-github.pages.dev",
};

export const themeMap = new Map(
  Object.entries(themeDomains).map(([theme, domain]) => [
    domain as string,
    theme as Theme,
  ])
);

export const classyDomains = {
  ...themeDomains,
  docs: repoUrl,
};
