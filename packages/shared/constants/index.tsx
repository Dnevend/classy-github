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
  default: "https://classygit.me",
  nes: "https://nes.classygit.me",
};

export const classyDomain = {
  ...themeDomains,
  docs: "https://101.classygit.me",
};
