import { Follower, User, Repo, Gist, RepoContent } from '@classy/types/github';
import { CacheKey, storeGet, storeSet } from "../cache"
import { GitApiFetch, FetchCache } from './index.d'
import { githubUrl } from '@classy/shared';

export const requestUrl = {
    user: (user: string) => `/users/${user}`,

    followers: (user: string) => `/users/${user}/followers`,

    following: (user: string) => `/users/${user}/following`,

    gists: (user: string) => `/users/${user}/gists`,

    gist: (gistId: string) => `/gists/${gistId}`,

    gistComments: (gistId: string) => `/gists/${gistId}/comments`,

    starred: (user: string) => `/users/${user}/starred`,

    // https://docs.github.com/zh/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-a-user
    repos: (user: string) => `/users/${user}/repos`,

    repo: (user: string, repo: string) => `/repos/${user}/${repo}`,

    repoContents: (user: string, repo: string) => `/repos/${user}/${repo}/contents`,

    events: (user: string) => `/users/${user}/events`
}

const cacheFetchData = (key: CacheKey, expire: number, data: any) => {
    storeSet(key, {
        expireTime: new Date().valueOf() + expire,
        value: data
    } as FetchCache)
}

const objToQueryParams = (obj: Record<string, any>) => {
    const queryParams = Object.keys(obj)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');
    return queryParams
}

/**
 * 拼接 base 与 path，容忍两侧任意数量的斜杠。
 * 之前用字符串直接相加，base 带尾斜杠时会拼出 `host//users/x`。
 */
const joinUrl = (base: string, path: string) =>
    `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

export const gitApiFetch: GitApiFetch = async (url, options) => {
    const { expire = 3 * 60 * 1000, params = {}, alt } = options || {}

    const queryParams = objToQueryParams(params)

    let fetchUrl = url

    if (queryParams) {
        fetchUrl = `${url}?${queryParams}`
    }

    const cacheData = storeGet(`fetch_${fetchUrl}`) as FetchCache

    if (cacheData && new Date().valueOf() < cacheData.expireTime) {
        return cacheData.value || alt
    }

    try {
        const res = await fetch(joinUrl(githubUrl.api, fetchUrl))

        if (res.ok) {
            const data = await res.json()
            cacheFetchData(`fetch_${fetchUrl}`, expire, data)
            return data
        }

        // 404 表示资源本身不存在（例如用户拼错了用户名）
        if (res.status === 404) {
            console.warn(`[gitApiFetch] 404 ${fetchUrl}`)
            return alt
        }

        // 403/429 基本都是匿名 60 次/小时的限流。代理下线后没有兜底，
        // 只能记日志：M1 起改由服务端带 token 取数，不再有这个问题。
        console.warn(`[gitApiFetch] ${res.status} ${res.statusText} ${fetchUrl}`)
    } catch (err) {
        console.warn('fetch error =>', err)
    }

    return alt
}

export const gitFetchFunc = {
    userinfo: async (user: string) => await gitApiFetch<User>(requestUrl.user(user)),

    userRepos: async (user: string, params?: Record<string, any>) => await gitApiFetch<Repo[]>(requestUrl.repos(user), { alt: [], params }),

    userRepo: async (user: string, repo: string) => await gitApiFetch<Repo>(requestUrl.repo(user, repo)),

    repoContents: async (user: string, repo: string) => await gitApiFetch<RepoContent[]>(requestUrl.repoContents(user, repo)),

    userGists: async (user: string, params?: Record<string, any>) => await gitApiFetch<Gist[]>(requestUrl.gists(user), { alt: [], params }),

    gist: async (gistId: string) => await gitApiFetch<Gist>(requestUrl.gist(gistId)),

    userFollowers: async (user: string, params?: Record<string, any>) => await gitApiFetch<Follower[]>(requestUrl.followers(user), { alt: [], params }),

    userFollowing: async (user: string, params?: Record<string, any>) => gitApiFetch<Follower[]>(requestUrl.following(user), { alt: [], params })
}