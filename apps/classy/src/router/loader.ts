import { gitApiFetch, requestUrl } from "@classy/lib";
import { LoaderFunctionArgs } from "react-router-dom";
import { Repo, User } from "@classy/types";

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