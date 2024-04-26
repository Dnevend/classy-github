const repoName = 'classy-github'

const configFileName = 'classy.config.json'

export const getUserConfigFilePath = (user: string) => `https://raw.githubusercontent.com/${user}/${repoName}/main/${configFileName}`