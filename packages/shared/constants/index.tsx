import { Theme } from "../theme";

export const repoName = "classy-github";

export const repoUrl = "https://github.com/dnevend/classy-github";

export const userConfigFile = "classy.config.json";

export const githubUrl = {
  api: "https://api.github.com",

  proxyApi: "https://api.classygit.me",

  gists: `https://gist.github.com`,

  raw: "https://raw.githubusercontent.com",

  new: "https://github.com/new",
};

export const themeDomains: Record<Theme, string> = {
  default: "classygit.me",
  nes: "nes.classygit.me",
  win95: "win95.classygit.me",
  mac: "mac.classygit.me",
};

export const themeMap = new Map(
  Object.entries(themeDomains).map(([theme, domain]) => [
    domain,
    theme as Theme,
  ])
);

export const classyDomains = {
  ...themeDomains,
  docs: "https://docs.classygit.me",
};
