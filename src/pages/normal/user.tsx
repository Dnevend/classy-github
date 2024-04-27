import { UserCard, Following, Followers } from "./components";
import { useClassyParams, useUserRepos, useUserinfo } from "@/lib/hooks";

export function UserPage() {
  const { user } = useClassyParams();

  const userinfo = useUserinfo(user);

  const repos = useUserRepos(user);

  return (
    <div className="p-6">
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
        <Following username={user} />
      </div>

      <div className="my-2">
        <Followers username={user} />
      </div>

      <p className="text-wrap break-words">{JSON.stringify(userinfo)}</p>
    </div>
  );
}

export default UserPage;
