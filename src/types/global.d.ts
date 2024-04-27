export type Theme = default | nes

export type CachePrefix =
    | 'user'
    | 'repos'
    | 'gists'
    | 'followers'
    | 'following'
    | 'config'

export type CacheKey = CachePrefix | `${CachePrefix}${string}` | string