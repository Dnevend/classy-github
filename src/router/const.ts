export const routes = {
    landing: '/',

    default: '/:user/*',
    defaultGists: '/:user/gists',
    defaultGistDetail: '/:user/gist/:gistId',

    nesUser: '/nes/:user/*',
    nesGists: '/nes/:user/gists',
    nesGistDetail: '/nes/:user/gist/:gistId'
}
