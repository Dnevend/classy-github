// import { apiFetch, requestUrl } from "@/lib/request";
// import { Repo, User } from "@/types/github";
// import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

export function UserPage() {
  const params = useParams();

  console.log("🐞 => Page => params:", params);

  //   apiFetch<User>(requestUrl.user('Dnevend')),
  // apiFetch<Repo[]>(requestUrl.repos(params.user), []),

  return (
    <div className="p-6">
      <h1>Default page</h1>
      <h2>username: {params.user}</h2>
      <Link to={`/${params.user}/gists`} className="text-sky-500">
        gists
      </Link>

      <p className="text-wrap break-words">{}</p>
    </div>
  );
}

export default UserPage;
