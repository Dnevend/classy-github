/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { gitFetchFunc } from "@classy/lib"
import { Gist } from "@classy/types/github"
import { useCallback, useEffect, useState } from "react"

interface PageFetchProps {
    user: string
    pageSize?: number
}

export const useGistsFetch = ({
    user,
    pageSize = 10
}: PageFetchProps) => {

    const [fetching, setFetching] = useState<boolean>(false)
    const [current, setCurrent] = useState<number>(1)
    const [pageResult, stePageResult] = useState<Record<number, Gist[]>>([])

    const datalist = pageResult[current] ?? []

    const hasNextPage = (pageResult[current + 1] ?? []).length > 0

    const goNext = () => {
        console.log('go next')
        setCurrent(p => p + 1)
    }

    const goPrev = () => {
        if (current === 1) return
        setCurrent(p => p - 1)
    }

    const fetchPageData = useCallback(
        (params?: Record<string, any>) => {
            return gitFetchFunc.userGists(user, params)
        },
        [user]
    )

    useEffect(() => {
        const fetch = async () => {
            try {
                setFetching(true)
                const currentPageData = await fetchPageData({ page: current, per_page: pageSize })
                const nextPageData = await fetchPageData({ page: current + 1, per_page: pageSize })
                stePageResult(res => ({
                    ...res,
                    [`${current}`]: currentPageData,
                    [`${current + 1}`]: nextPageData
                }))
            } catch {
                setFetching(false)
            }
        }
        fetch()
    }, [current, pageSize, fetchPageData])

    return { current, goNext, goPrev, fetching, hasNextPage, datalist }
}