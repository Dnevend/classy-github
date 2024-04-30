import { useParams } from "react-router-dom";

export function UserPage() {
  const params = useParams();

  console.log("🐞 => Page => params:", params);

  //   apiFetch<User>(requestUrl.user('Dnevend')),
  // apiFetch<Repo[]>(requestUrl.repos(params.user), []),

  return (
    <div className="p-6">
      <h1>NES page</h1>
      <h2>username: {params.user}</h2>
      <a>gists</a>
      <p className="text-wrap break-words">{}</p>
    </div>
  );
}

export default UserPage;
