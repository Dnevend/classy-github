import { Theme } from "../theme";

export const repoName = "classy-github";

export const repoUrl = "https://github.com/dnevend/classy-github";

export const userConfigFile = "classy.config.json";

export const githubUrl = {
  api: "https://api.github.com",

  /**
   * GitHub REST 代理，部署在 Cloudflare Workers 上。
   * 注意：这里**不能带尾斜杠**，请求路径由 `joinUrl` 统一拼接。
   * TODO(M1): 迁移到 Astro 服务端渲染后本代理可下线，改由服务端直连 + 边缘缓存。
   */
  proxyApi: "https://classy-api.dnevend.workers.dev",

  gists: `https://gist.github.com`,

  raw: "https://raw.githubusercontent.com",

  new: "https://github.com/new",
};

/**
 * 只有实际部署了的主题才列在这里。
 * 未列出的主题不会出现在主题选择器里，`redirectTheme` 也会直接忽略，
 * 避免把用户跳到不存在的域名（历史问题：win95/mac 子域从未部署）。
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
