import { Follower, Gist, Repo, User } from "@/types/github"
import { useEffect, useState } from "react"
import { gitFetchFunc } from "../request"

export const useUserinfo = (user: string) => {
    const [userinfo, setUserinfo] = useState<User | null>(null)

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.userinfo(user)
            setUserinfo(data)
        })()
    }, [user])

    return userinfo
}

export const useUserRepos = (user: string) => {
    const [repos, setRepos] = useState<Repo[]>([])

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.userRepos(user)
            setRepos(data!)
        })()
    }, [user])

    return repos
}

export const useUserGists = (user: string) => {
    const [gists, setGists] = useState<Gist[]>([])

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.userGists(user)
            setGists(data!)
        })()
    }, [user])

    return gists
}

export const useGist = (gistId: string) => {
    const [gist, setGist] = useState<Gist | null>(null);

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.gist(gistId)
            setGist(data)
        })()
    }, [gistId])

    return gist
}

export const useUserFollowers = (user: string) => {
    const [followers, setFollowers] = useState<Follower[]>([]);

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.userFollowers(user);
            setFollowers(data!)
        })();
    }, [user]);

    return followers
}

export const useUserFollowing = (user: string) => {
    const [following, setFollowing] = useState<Follower[]>([]);

    useEffect(() => {
        (async () => {
            const data = await gitFetchFunc.userFollowing(user);
            setFollowing(data!)
        })();
    }, [user]);

    return following
}