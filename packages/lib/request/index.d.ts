
export type FetchOptions<T extends any> = {
    expire: number,
    alt: T,
    params: Record<string, any>
}

export type GitApiFetch = <T extends any = any>(url: string, options?: Partial<FetchOptions<T>>) => Promise<T>

export type FetchCache = {
    expireTime: number,
    value: any
}