
export type FetchOptions<T extends any = any> = {
    expire: number,
    alt: T,
    params: Record<string, any>,
    priority: RequestPriority
}

export type GitApiFetch = <T extends any = any>(url: string, options?: Partial<FetchOptions<T>>) => Promise<T>

export type FetchCache = {
    expireTime: number,
    value: any
}