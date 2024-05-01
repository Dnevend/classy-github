import { Theme } from "@classy/shared"

type ClassyConfig = {
    theme: Theme
    profile: {
        repos: {
            visible: boolean,
            showCount: number
        },
        cover: string
    },
    gists: {
        prefix: `Classy` | string,
        split: string,
        nav: {
            key: string,
            desc?: string
        }[]
    },
    links?: {
        title: string,
        href: string
    }[]
}