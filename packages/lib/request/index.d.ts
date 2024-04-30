
export type FetchOptions<T extends any> = {
    expire: number,
    alt: T
}

export type GitApiFetch = <T extends any = any>(url: string, options?: Partial<FetchOptions<T>>) => Promise<T | null>

export type FetchCache = {
    expireTime: number,
    value: any
}