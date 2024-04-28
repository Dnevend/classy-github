export type Lng = 'en' | 'zh'

export type Theme = default | nes

export type CachePrefix =
    | 'user'
    | 'repos'
    | 'gists'
    | 'followers'
    | 'following'
    | 'config'

export type CacheKey = CachePrefix | `${CachePrefix}${string}` | string

export interface ClassyConfig {
    theme: Theme,
    profile: {
        repositories: {
            visible: boolean,
            showCount: number
        }
    },
    gists: {
        prefix: string
        split: string
    },
    links: { title: string, href: string }[]
}