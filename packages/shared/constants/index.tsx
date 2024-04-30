import { Theme } from "../theme";

const repoName = "classy-github";

const configFileName = "classy.config.json";

export const githubUrl = {
  gists: `https://gist.github.com/`,

  userConfigFilepath: (user: string) =>
    `https://raw.githubusercontent.com/${user}/${repoName}/main/${configFileName}`,

  userGists: (user: string) => `https://gist.github.com/${user}`,
} as const;

export const themeDomains: Record<Theme, string> = {
  default: "classygit.me",
  nes: "nes.classygit.me",
  win95: "win95.classygit.me",
};

export const themeMap = new Map(
  Object.entries(themeDomains).map(([theme, domain]) => [
    domain,
    theme as Theme,
  ])
);

export const classyDomain = {
  ...themeDomains,
  docs: "https://101.classygit.me",
};
