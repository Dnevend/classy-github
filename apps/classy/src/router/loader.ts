import { gitApiFetch, requestUrl } from "@classy/lib";
import { LoaderFunctionArgs } from "react-router-dom";
import { User } from "@classy/types";

export async function userLoader(args: LoaderFunctionArgs<{ user: string }>) {
    const { user } = args.params

    let userinfo = null

    if (user) {
        userinfo = await gitApiFetch<User>(requestUrl.user(user));
    }

    return { userinfo }
}