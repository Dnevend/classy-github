/* eslint-disable @typescript-eslint/no-explicit-any */
export interface User {
    login: string,
    id: number,
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: boolean
    name: string
    company: string
    blog: string
    location: string
    email: string | null
    hireable: boolean
    bio: string
    twitter_username: string
    public_repos: number
    public_gists: number
    followers: number
    following: number
    created_at: string
    updated_at: string
}

export interface Repo {
    id: number
    node_id: string
    name: string
    full_name: string
    private: boolean
    html_url: string
    description: string | null
    fork: boolean
    url: string
    forks_url: string
    forks_count: number
    stargazers_count: number,
    watchers_count: number,
    language: string,
    is_template: boolean
    homepage: string
    created_at: string
    updated_at: string
    pushed_at: string
}

export interface Gist {
    id: string
    node_id: string
    url: string
    forks_url: string
    html_url: string
    files: Record<string, GistFile>
    public: boolean
    created_at: string
    updated_at: string
    description: string
    comments: number
    owner: User
}

export interface GistFile {
    content: string
    filename: string
    language: string
    raw_url: string
    size: number,
    truncated: boolean
    type: string
}

export interface Follower {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    html_url: string
}

export type Following = Follower