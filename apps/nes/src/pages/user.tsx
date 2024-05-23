import { cn, gitFetchFunc, useClassyConfig } from "@classy/lib";
import { Follower, Following, Repo, User } from "@classy/types";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const Account = ({
  avatar,
  name,
  onClick,
}: {
  avatar: string;
  name: string;
  onClick: () => void;
}) => {
  return (
    <div className="flex flex-col items-center" onClick={onClick}>
      <img
        className={cn("nes-avatar is-rounded")}
        alt={`${name}'s avatar`}
        src={avatar}
        style={{ imageRendering: "pixelated" }}
      />
      <p>{name}</p>
    </div>
  );
};

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useParams() as { user: string };
  const classyConfig = useClassyConfig(user);

  const [userinfo, setUserinfo] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);

  const showRepos = repos
    .sort((a, b) => {
      const aCount = a.stargazers_count + a.forks_count;
      const bCount = b.stargazers_count + b.forks_count;
      return aCount > bCount ? -1 : 1;
    })
    .slice(0, classyConfig.profile.repos.showCount);

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
      <div className="nes-container with-title is-centered">
        <p className="title">{userinfo?.login}</p>

        <div className="flex items-center justify-center gap-2">
          <img
            className={cn("nes-avatar is-rounded", "!w-12 !h-12")}
            alt={`${userinfo?.name}'s avatar`}
            src={userinfo?.avatar_url}
            style={{ imageRendering: "pixelated" }}
          />
          <p>{userinfo?.name}</p>
        </div>

        <p>{userinfo?.bio}</p>

        <Link to={userinfo?.html_url || ""}>
          <i className="nes-icon github" />
        </Link>
      </div>

      <section className="mt-12">
        <h2>Repos</h2>
        <div>
          {showRepos.map((it) => (
            <div>{it.name}</div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2>Followers</h2>
        <div className="flex flex-wrap gap-6 mx-auto">
          {followers.map((it) => (
            <Account
              name={it.login}
              avatar={it.avatar_url}
              onClick={() => navigate(`/${it.login}`)}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2>Following</h2>
        <div className="flex flex-wrap gap-6 mx-auto">
          {following.map((it) => (
            <Account
              name={it.login}
              avatar={it.avatar_url}
              onClick={() => navigate(`/${it.login}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default UserPage;
