export const routes = {
    landing: '/',

    user: '/:user/*',

    gists: '/:user/gists',
    gistDetail: '/:user/gist/:gistId',

    repos: '/:user/repos',
    repoDetail: '/:user/repo/:repoId'
}
