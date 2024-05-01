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

/** 
 * - Check if the gist description matches the rule
 * - 检查Gist描述是否符合匹配规则
 * @returns boolean
 */
export const matchGistRule = (gistStr: string, rule: {
    prefix: string,
    split: string,
    type: string
}) => {
    const { prefix, split, type } = rule

    const ruleStr = `${prefix}${split}${type}`.toLowerCase()

    const _gistStr = gistStr.toLowerCase()

    return _gistStr.includes(ruleStr)
}

/**
 * - Get the matched string content
 * - 获取匹配后的字符串内容
 * @returns string
 */
export const getGistMatchStr = (gistStr: string, rule: {
    prefix: string,
    split: string,
    type: string
}) => {
    const { prefix, split, type } = rule

    const ruleStr = `${prefix}${split}${type}`.toLowerCase()

    const _gistStr = gistStr.toLowerCase()

    const matchIndex = _gistStr.indexOf(ruleStr)

    // Gist description does not match the rule, return the origin string
    // Gist描述与规则不匹配，返回原始字符串
    if (matchIndex === -1) return gistStr

    const matchStr = _gistStr.slice(matchIndex + ruleStr.length, _gistStr.length)

    if (matchStr.startsWith(split)) return matchStr.slice(1, matchStr.length)

    return matchStr
}