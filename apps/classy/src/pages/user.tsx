import { UserCard } from "@/components/user-card";
import { AnimatedTooltip } from "@/components/animated-tooltip";
import { Link, useNavigate } from "react-router-dom";
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
import { MarkdownPreview } from "@classy/components";
import { useThemeMode } from "@/hooks/useThemeMode";

const RepoCard = ({
  user,
  repo,
  className,
}: {
  user: string;
  repo: Repo;
  className: string;
}) => (
  <Link
    to={`/${user}/repo/${repo.name}`}
    className={cn(
      "flex flex-col justify-between h-auto w-full p-4 border rounded-lg hover:shadow text-wrap break-words",
      className
    )}
  >
    <div>
      <h3
        className={cn(
          "text-lg font-bold line-clamp-1",
          "bg-gradient-to-r bg-clip-text text-transparent",
          "from-slate-900 to-slate-500 dark:from-slate-300 dark:to-slate-50"
        )}
      >
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
  </Link>
);

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useClassyParams();
  const { theme } = useThemeMode();
  const classyConfig = useClassyConfig(user);

  const [readme, setReadme] = useState<{
    path?: string;
    source?: string;
  } | null>(null);
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
      const data = await gitFetchFunc.userRepos(user, {
        sort: "updated",
        per_page: 100,
      });
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

    // 获取用户个人自述文件
    // https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme
    (async () => {
      const repoContents = await gitFetchFunc.repoContents(user, user);
      const readmeRawUrl = repoContents?.find(
        (it) => it.name.toLowerCase() === "readme.md"
      )?.download_url;
      if (readmeRawUrl) {
        const data = await fetch(readmeRawUrl);
        if (data.ok) {
          const readme = await data.text();
          setReadme({
            path: readmeRawUrl.substring(0, readmeRawUrl.lastIndexOf("/") + 1),
            source: readme,
          });
        }
      } else {
        setReadme(null);
      }
    })();
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex sm:hidden flex-col gap-2 mt-4">
        <UserCard userinfo={userinfo} />

        <div className="w-full mx-auto flex gap-2">
          <Link
            to={`/${user}/repos`}
            className={cn(
              "w-full flex flex-col items-center py-2 px-6 border rounded-lg hover:shadow-sm",
              "bg-gray-50 dark:bg-black dark:border-white/[0.2]"
            )}
          >
            <span>Repos</span>
            <strong>{userinfo?.public_repos}</strong>
          </Link>

          <Link
            to={`/${user}/gists`}
            className={cn(
              "w-full flex flex-col items-center py-2 px-6 border rounded-lg hover:shadow-sm",
              "bg-gray-50 dark:bg-black dark:border-white/[0.2]"
            )}
          >
            <span>Gists</span>
            <strong>{userinfo?.public_gists}</strong>
          </Link>
        </div>
      </div>

      {/* FIXME: width */}
      {readme?.source && (
        <MarkdownPreview
          source={readme?.source}
          pathRewrite={{ absPath: readme?.path }}
          wrapperElement={{ "data-color-mode": theme }}
          className="my-6 rounded-md overflow-hidden"
        />
      )}

      {/* TODO: skelton */}
      <div className="h-auto w-full flex justify-center items-center">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showRepos?.map((it, index) => (
            <RepoCard
              key={it.id}
              user={user}
              repo={it}
              className={cn({
                "col-span-2":
                  showRepos.length % 2 !== 0 && index === showRepos.length - 1,
              })}
            />
          ))}
        </div>
      </div>

      {followers.length > 0 && (
        <section>
          <Link to={`https://github.com/${user}?tab=followers`} target="_blank">
            <h2
              className={cn(
                "text-center font-bold tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                "from-slate-600 to-slate-900 dark:from-slate-50 dark:to-slate-300"
              )}
            >
              Followers
            </h2>
          </Link>
          <div className="flex flex-row flex-wrap my-2 items-center justify-center w-full">
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
        </section>
      )}

      {following.length > 0 && (
        <section>
          <Link to={`https://github.com/${user}?tab=following`} target="_blank">
            <h2
              className={cn(
                "text-center font-bold tracking-wide bg-gradient-to-r bg-clip-text text-transparent",
                "from-slate-600 to-slate-900 dark:from-slate-50 dark:to-slate-300"
              )}
            >
              Following
            </h2>
          </Link>
          <div className="flex flex-row flex-wrap my-2 items-center justify-center w-full">
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
        </section>
      )}
    </div>
  );
}

export default UserPage;
