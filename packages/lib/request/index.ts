import { Follower, User, Repo, Gist } from '@classy/types/github';
import { CacheKey, storeGet, storeSet } from "../cache"
import { GitApiFetch, FetchCache } from './index.d'
import { githubUrl } from '@classy/shared';

export const requestUrl = {
    user: (user: string) => `/users/${user}`,
    followers: (user: string) => `/users/${user}/followers`,
    following: (user: string) => `/users/${user}/following`,
    gists: (user: string) => `/users/${user}/gists`,
    gist: (gistId: string) => `/gists/${gistId}`,
    starred: (user: string) => `/users/${user}/starred`,
    repos: (user: string) => `/users/${user}/repos`,
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

export const gitApiFetch: GitApiFetch = async (url, options) => {
    const { expire = 60 * 1000, params = {}, alt } = options || {}

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
        const res = await fetch(githubUrl.api + fetchUrl)

        if (res.ok) {
            const data = await res.json()
            cacheFetchData(`fetch_${fetchUrl}`, expire, data)
            return data
        }
    } catch (err) {
        console.warn('fetch error =>', err)
    }

    try {
        const refetchRes = await fetch(githubUrl.proxyApi + fetchUrl)

        const data = await refetchRes.json()
        cacheFetchData(`fetch_${fetchUrl}`, expire, data)
        return data
    } catch (err) {
        console.warn('refetch error =>', err)
    }

    return alt
}

const serviceApiFetch = (url: string) => {
    // TODO: 替换正式环境服务地址
    return fetch((import.meta.env.MODE  === 'development' ? 'http://localhost:8787' : '') + url).then((res) => {
        return res.json()
    });
}

export const gitFetchFunc = {
    userinfo: async (user: string) => await gitApiFetch<User>(requestUrl.user(user)),

    userRepos: async (user: string, params?: Record<string, any>) => await gitApiFetch<Repo[]>(requestUrl.repos(user), { alt: [], params }),

    userGists: async (user: string, params?: Record<string, any>) => await gitApiFetch<Gist[]>(requestUrl.gists(user), { alt: [], params }),

    gist: async (gistId: string) => await gitApiFetch<Gist>(requestUrl.gist(gistId)),

    userFollowers: async (user: string, params?: Record<string, any>) => await gitApiFetch<Follower[]>(requestUrl.followers(user), { alt: [], params }),

    userFollowing: async (user: string, params?: Record<string, any>) => gitApiFetch<Follower[]>(requestUrl.following(user), { alt: [], params })
}

export const serviceFetchFunc = {
    githubContributions: (user:string) => serviceApiFetch(`/api/github-contributions/${user}`)
}