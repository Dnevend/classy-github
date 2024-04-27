/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import { Follower, Gist, Repo, User } from "@/types/github"
import { storeGet, storeSet } from "./cache"

export type FetchOptions<T extends any> = {
    expire: number,
    alt: T
}

export type GitApiFetch = <T extends any = any>(url: string, options?: Partial<FetchOptions<T>>) => Promise<T | null>

export type FetchCache = {
    expireTime: number,
    value: any
}

export const apiBaseUrl = "https://api.github.com"

export const apiProxyUrl = "https://api.classygit.me"

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

const cacheFetchData = (key: string, expire: number, data: any) => {
    storeSet(key, {
        expireTime: new Date().valueOf() + expire,
        value: data
    } as FetchCache)
}

const gitApiFetch: GitApiFetch = async (url, options) => {
    const { expire = 60 * 1000, alt } = options || {}

    const cacheData = storeGet(url) as FetchCache

    if (cacheData && new Date().valueOf() < cacheData.expireTime) {
        return cacheData.value || alt
    }

    try {
        const res = await fetch(apiBaseUrl + url)

        if (res.ok) {
            const data = await res.json()
            cacheFetchData(url, expire, data)
            return data
        }
    } catch (err) {
        console.warn('fetch error =>', err)
    }

    try {
        const refetchRes = await fetch(apiProxyUrl + url)

        const data = await refetchRes.json()
        cacheFetchData(url, expire, data)
        return data
    } catch (err) {
        console.warn('refetch error =>', err)
    }

    return alt || null
}

export const gitFetchFunc = {
    userinfo: async (user: string) => await gitApiFetch<User>(requestUrl.user(user)),

    userRepos: async (user: string) => await gitApiFetch<Repo[]>(requestUrl.repos(user), { alt: [] }),

    userGists: async (user: string) => await gitApiFetch<Gist[]>(requestUrl.gists(user), { alt: [] }),

    gist: async (gistId: string) => await gitApiFetch<Gist>(requestUrl.gist(gistId)),

    userFollowers: async (user: string) => await gitApiFetch<Follower[]>(requestUrl.followers(user), { alt: [] }),

    userFollowing: async (user: string) => gitApiFetch<Follower[]>(requestUrl.following(user), { alt: [] })
}