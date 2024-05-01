export * from './style'

import { Theme, themeDomains, themeMap } from '@classy/shared'

export const redirectTheme = (theme: Theme) => {
    const { pathname, search } = window.location
    const themeDomain = themeDomains[theme]
    window.location.href = `https://${themeDomain}${pathname}${search}`
}

export const getCurrentTheme = (alt?: Theme) => {
    const { host } = window.location
    const theme = themeMap.get(host)
    return theme || alt || 'default'
}

// TODO:
export const getGistShowName = (prefix: string, split: string, type: string, desc: string) => {

    const match = desc.includes(`${prefix}${split}${type}`)

    if (!match) return desc

    return desc
}