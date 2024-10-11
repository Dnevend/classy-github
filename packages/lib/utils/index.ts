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
export const matchGistRule = (gistStr: string | undefined, rule: {
    prefix: string,
    split: string,
    type: string
}) => {
    if (!gistStr) return false

    const { prefix = 'classy', split = '.', type } = rule || {};

    // Escape special regex characters in the split
    const escapedSplit = split.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // If type is provided, use it; otherwise, match any word characters (letters)
    const typePattern = type ? type : '[a-zA-Z]+';

    // Create a regex pattern to match the rule format with optional type
    const regex = new RegExp(`^${prefix}${escapedSplit}${typePattern}${escapedSplit}(.+)$`, 'i');

    // Attempt to match the gistStr using the regex pattern
    const match = gistStr.match(regex);

    return !!match;
}

/**
 * - Get the matched string content
 * - 获取匹配后的字符串内容
 * @returns string
 */
export const getGistMatchStr = (gistStr: string | undefined, rule?: {
    prefix: string,
    split: string,
    type?: string
}) => {
    if (!gistStr) return '';

    const { prefix = 'classy', split = '.', type } = rule || {};

    const escapedSplit = split.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const typePattern = type ? type : '[a-zA-Z]+';

    const regex = new RegExp(`^${prefix}${escapedSplit}${typePattern}${escapedSplit}(.+)$`, 'i');

    const match = gistStr.match(regex);

    return match ? match[1] : gistStr;
}

/**
 * 判断路径是否为绝对地址
 * Check if the path is an absolute address
 * @param str 
 * @returns boolean
 */
export const isAbsolutePath = (str: string) => /^[a-z][a-z0-9+.-]*:/.test(str);