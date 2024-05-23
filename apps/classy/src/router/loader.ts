import { gitApiFetch, requestUrl } from "@classy/lib";
import { LoaderFunctionArgs } from "react-router-dom";
import { Gist, Repo, User } from "@classy/types";

export async function userLoader(args: LoaderFunctionArgs<{ user: string }>) {
    const { user } = args.params

    let userinfo = null

    if (user) {
        userinfo = await gitApiFetch<User>(requestUrl.user(user));
    }

    return { userinfo }
}

export async function reposLoader(args: LoaderFunctionArgs<{ user: string }>) {
    const { user } = args.params

    let repos: Repo[] = []

    if (user) {
        repos = await gitApiFetch<Repo[]>(requestUrl.repos(user), {
            params: {
                sort: "updated",
                per_page: 100
            }
        });
    }

    return { repos }
}

export async function repoLoader(args: LoaderFunctionArgs<{ user: string, repo: string }>) {
    const { user, repo } = args.params

    let repository: Repo | null = null

    if (user && repo) {
        repository = await gitApiFetch<Repo>(requestUrl.repo(user, repo));
    }

    return { repository }
}

export async function gistLoader(args: LoaderFunctionArgs<{ gistId: string }>) {
    const { gistId } = args.params

    let gist: Gist | null = null

    if (gistId) {
        gist = await gitApiFetch<Gist>(requestUrl.gist(gistId));
    }

    return { gist }
}