import { apiFetch, requestUrl } from "@/lib/request";
import { Repo, User } from "@/types/github";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { UserCard, Following, Followers } from "./components";

export function UserPage() {
  const params = useParams() as { user: string };

  console.log("🐞 => Page => params:", params);

  const [userinfo, setUserinfo] = useState<User | null>(null);

  const [repos, setRepos] = useState<Repo[]>([]);

  useEffect(() => {
    const init = async () => {
      const _userinfo = await apiFetch<User>(requestUrl.user(params.user));
      setUserinfo(_userinfo);

      const _repos = await apiFetch<Repo[]>(requestUrl.repos(params.user), []);
      setRepos(_repos!);
    };
    init();
  }, [params]);

  return (
    <div className="p-6">
      <h1>Default page</h1>
      <h2>username: {params.user}</h2>
      <Link to={`/${params.user}/gists`} className="text-indigo-600">
        Gists
      </Link>

      <div className="flex gap-6 justify-between flex-col md:flex-row">
        <UserCard userinfo={userinfo} />

        <div className="grid grid-cols-3 gap-4">
          {repos?.map((it) => (
            <div key={it.id} className="p-4 border rounded-md hover:shadow">
              {it.name}
            </div>
          ))}
        </div>
      </div>

      <div className="my-2">
        <Following username={params.user} />
      </div>

      <div className="my-2">
        <Followers username={params.user} />
      </div>

      <p className="text-wrap break-words">{JSON.stringify(userinfo)}</p>
    </div>
  );
}

export default UserPage;
