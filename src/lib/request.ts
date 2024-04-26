/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const apiFetch: <T extends any = any>(url: string, alt?: T) => Promise<T | null> = async (url, alt) => {
    try {
        const res = await fetch(apiBaseUrl + url)

        if (res.ok)
            return res.json()
    } catch (err) {
        console.warn('fetch error =>', err)
    }

    try {
        const refetchRes = await fetch(apiProxyUrl + url)

        return refetchRes.json()
    } catch (err) {
        console.warn('refetch error =>', err)
    }

    return alt || null
}