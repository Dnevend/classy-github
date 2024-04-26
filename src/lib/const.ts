const repoName = 'github-profile'

const configFileName = 'profile.config.json'

export const getUserConfigFetchUrl = (user: string) => `https://raw.githubusercontent.com/${user}/${repoName}/main/${configFileName}`