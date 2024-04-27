const repoName = 'classy-github'

const configFileName = 'classy.config.json'

export const githubUrl = {
    gists: `https://gist.github.com/`,

    userConfigFilepath: (user: string) => `https://raw.githubusercontent.com/${user}/${repoName}/main/${configFileName}`,

    userGists: (user: string) => `https://gist.github.com/${user}`
} as const