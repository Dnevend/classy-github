import { UserCard } from "@/components/user-card";
import { AnimatedTooltip } from "@/components/animated-tooltip";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Follower, Repo, User } from "@classy/types/github";
import {
  useClassyParams,
  gitFetchFunc,
  useClassyConfig,
  cn,
} from "@classy/lib";
import { GitFork, Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const RepoCard = ({ repo, className }: { repo: Repo; className: string }) => (
  <div
    className={cn(
      "flex flex-col justify-between h-auto w-full p-4 border rounded-lg hover:shadow text-wrap break-words",
      className
    )}
  >
    <div>
      <h3 className="text-lg font-bold line-clamp-1 bg-gradient-to-r from-slate-800 to-slate-400 bg-clip-text text-transparent">
        {repo.name}
      </h3>
      {repo.description && (
        <Tooltip>
          <TooltipTrigger>
            <p className="text-xs text-slate-500 text-start line-clamp-3">
              {repo.description}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm max-w-60">{repo.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>

    <div>
      <Separator className="mt-4 mb-2" />

      <div className="flex gap-3">
        <span className="flex items-center gap-1 text-sm">
          <Star size={12} />
          <span>{repo.stargazers_count}</span>
        </span>
        <span className="flex items-center gap-1 text-sm">
          <GitFork size={12} />
          <span>{repo.forks_count}</span>
        </span>
      </div>
    </div>
  </div>
);

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useClassyParams();
  const classyConfig = useClassyConfig(user);

  const [userinfo, setUserinfo] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Follower[]>([]);

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
    <>
      <div className="flex gap-6 justify-between flex-col md:flex-row">
        <UserCard userinfo={userinfo} />

        <div className="h-auto w-full flex justify-center items-center">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showRepos?.map((it, index) => (
              <RepoCard
                repo={it}
                className={cn({
                  "col-span-2":
                    showRepos.length % 2 !== 0 &&
                    index === showRepos.length - 1,
                })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-row flex-wrap my-6 items-center justify-center mb-10 w-full">
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
    </>
  );
}

export default UserPage;
