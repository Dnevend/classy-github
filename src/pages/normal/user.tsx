import { UserCard } from "./components";
import { useClassyParams } from "@/lib/hooks";
import { AnimatedTooltip } from "./components/animated-tooltip";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Follower, Repo, User } from "@/types/github";
import { gitFetchFunc } from "@/lib/request";

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useClassyParams();

  const [userinfo, setUserinfo] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.userinfo(user);
      setUserinfo(data);
    })();

    (async () => {
      const data = await gitFetchFunc.userRepos(user);
      setRepos(data!);
    })();

    (async () => {
      const data = await gitFetchFunc.userFollowers(user);
      setFollowers(data!);
    })();

    (async () => {
      const data = await gitFetchFunc.userFollowing(user);
      setFollowing(data!);
    })();
  }, [user]);

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

      <div className="flex flex-row flex-wrap my-2 items-center justify-center mb-10 w-full">
        {followers.length > 0 && (
          <AnimatedTooltip
            items={followers.map((it) => ({
              id: it.id,
              name: it.login,
              designation: it.html_url,
              image: it.avatar_url,
            }))}
            onItemClick={(item) => navigate(`/${item.name}`)}
          />
        )}
      </div>

      <div className="flex flex-row flex-wrap my-2 items-center justify-center mb-10 w-full">
        {following.length > 0 && (
          <AnimatedTooltip
            items={following.map((it) => ({
              id: it.id,
              name: it.login,
              designation: it.html_url,
              image: it.avatar_url,
            }))}
            onItemClick={(item) => navigate(`/${item.name}`)}
          />
        )}
      </div>

      <p className="text-wrap break-words">{JSON.stringify(userinfo)}</p>
    </div>
  );
}

export default UserPage;
