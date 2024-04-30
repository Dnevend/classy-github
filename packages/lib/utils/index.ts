export * from './style'

import { Theme, themeMap } from '@classy/shared'

export const getCurrentTheme = (alt?: Theme) => {
    const { host } = window.location
    const theme = themeMap.get(host)
    return theme || alt || 'default'
}