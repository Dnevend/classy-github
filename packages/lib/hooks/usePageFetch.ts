/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"

interface PageFetchProps<T> {
    pageSize?: number
    fetchFunc: (params: { page: number; per_page: number }) => Promise<T[]>
}

export const usePageFetch = <T extends any = any>({
    pageSize = 30,
    fetchFunc
}: PageFetchProps<T>) => {

    const [fetching, setFetching] = useState<boolean>(false)
    const [current, setCurrent] = useState<number>(1)
    const [pageResult, setPageResult] = useState<Record<number, T[]>>({})

    const datalist = pageResult[current] ?? []

    const allDataList = Object.entries(pageResult).map(([, _dataList]) => _dataList).flat()

    const hasMore = (pageResult[current + 1] ?? []).length > 0

    const goNext = () => {
        setCurrent(p => p + 1)
    }

    const goPrev = () => {
        if (current === 1) return
        setCurrent(p => p - 1)
    }

    useEffect(() => {
        const fetch = async () => {
            try {
                setFetching(true)
                const currentPageData = await fetchFunc({ page: current, per_page: pageSize })
                const nextPageData = await fetchFunc({ page: current + 1, per_page: pageSize })
                setPageResult(res => ({
                    ...res,
                    [`${current}`]: currentPageData,
                    [`${current + 1}`]: nextPageData
                }))
            } catch {
                setFetching(false)
            }
        }
        fetch()
    }, [current, pageSize, fetchFunc])

    return { current, goNext, goPrev, fetching, hasMore, datalist, allDataList }
}