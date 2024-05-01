import store from 'store2'

export type CachePrefix =
    | 'config'
    | 'fetch'

export type CacheKey = `${CachePrefix}_${string}`

const prefix = (key: CacheKey) => `classy_${key}`;

export const storeSet = (key: CacheKey, value: any) => store.set(prefix(key), value)

export const storeGet = (key: CacheKey, alt?: any) => store.get(prefix(key), alt)

export const storeRemove = (key: CacheKey) => store.remove(prefix(key))

export const storeReset = () => store.clearAll()