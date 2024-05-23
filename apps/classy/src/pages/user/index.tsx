import { AnimatedTooltip } from "@/components/animated-tooltip";
import { Link, useLoaderData, useNavigate, useParams } from "react-router-dom";
import {
  Follower,
  Following,
  Repo,
  RepoContent,
  User,
} from "@classy/types/github";
import { useClassyConfig, cn, gitApiFetch, requestUrl } from "@classy/lib";
import RepoCard from "../repos/RepoCard";
import { MarkdownPreview } from "@classy/components";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "./ProfileCard";

// FIXME: /cumsoft

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useParams() as { user: string };
  const { userinfo } = useLoaderData() as { userinfo: User | null };
  const { theme } = useThemeMode();
  const classyConfig = useClassyConfig(user);

  const { data: repos = [], isLoading: reposLoading } = useQuery<Repo[]>({
    queryKey: ["repos", user, { sort: "updated", per_page: 100 }],
    queryFn: () =>
      gitApiFetch(requestUrl.repos(user), {
        params: {
          sort: "updated",
          per_page: 100,
        },
        priority: "high",
      }),
    select: (data) =>
      data
        .sort((a, b) => {
          const aCount = a.stargazers_count + a.forks_count;
          const bCount = b.stargazers_count + b.forks_count;
          return aCount > bCount ? -1 : 1;
        })
        .slice(0, classyConfig.profile.repos.showCount),
  });

  const { data: followers = [], isLoading: followerLoading } = useQuery<
    Follower[]
  >({
    queryKey: ["followers", user],
    queryFn: () => gitApiFetch(requestUrl.followers(user), { priority: "low" }),
  });

  const { data: following = [], isLoading: followingLoading } = useQuery<
    Following[]
  >({
    queryKey: ["followers", user],
    queryFn: () => gitApiFetch(requestUrl.followers(user), { priority: "low" }),
  });

  const { data: readme, isLoading: readmeLoading } = useQuery<{
    path?: string;
    source?: string;
  } | null>({
    queryKey: ["readme", user],
    // 获取用户个人自述文件
    // https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme
    queryFn: async () => {
      const repoContents = await gitApiFetch<RepoContent[]>(
        requestUrl.repoContents(user, user),
        { priority: "high" }
      );

      const readmeRawUrl = repoContents?.find(
        (it) => it.name.toLowerCase() === "readme.md"
      )?.download_url;

      if (readmeRawUrl) {
        const data = await fetch(readmeRawUrl);
        if (data.ok) {
          const readme = await data.text();

          return {
            path: readmeRawUrl.substring(0, readmeRawUrl.lastIndexOf("/") + 1),
            source: readme,
          };
        }
      }

      return null;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="block sm:hidden mt-4">
        <ProfileCard user={user} userinfo={userinfo} />
      </div>

      {readmeLoading && <Skeleton className="w-full h-32" />}
      {/* FIXME: width */}
      {readme?.source && (
        <MarkdownPreview
          source={readme?.source}
          pathRewrite={{ absPath: readme?.path }}
          wrapperElement={{ "data-color-mode": theme }}
          className="my-6 rounded-md overflow-hidden"
        />
      )}

      <div className="h-auto w-full flex justify-center items-center">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reposLoading && (
            <>
              {new Array(6).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </>
          )}

          {repos?.map((it, index) => (
            <RepoCard
              key={it.id}
              user={user}
              repo={it}
              className={cn({
                "col-span-2":
                  repos.length % 2 !== 0 && index === repos.length - 1,
              })}
            />
          ))}
        </div>
      </div>

      {(followerLoading || followingLoading) && (
        <div className="flex -gap-2 mx-auto">
          {new Array(6).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-14 w-14 rounded-full" />
          ))}
        </div>
      )}

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
