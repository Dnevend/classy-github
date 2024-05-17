/* eslint-disable @typescript-eslint/no-explicit-any */
import { Separator } from "@/components/ui/separator";
import { cn, gitFetchFunc, usePageFetch } from "@classy/lib";
import { Repo, User } from "@classy/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { BookCopy, Ellipsis, ExternalLink, GitFork, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SvgPlaceholder from "@/assets/placeholder.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { githubUrl } from "@classy/shared";

const RepoCard = ({
  user,
  repo,
  className,
}: {
  user: string;
  repo: Repo;
  className?: string;
}) => (
  <Link
    to={`/${user}/repo/${repo.name}`}
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
  </Link>
);
export function Repos() {
  const { user } = useParams() as { user: string };

  const [userinfo, setUserinfo] = useState<User | null>(null);

  const fetchRepos = useCallback(
    (params?: Record<string, any>) => {
      return gitFetchFunc.userRepos(user, { sort: "updated", ...params });
    },
    [user]
  );

  const { allDataList, hasMore, loadMore, fetching } = usePageFetch({
    pageSize: 100,
    fetchFunc: fetchRepos,
  });

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.userinfo(user);
      setUserinfo(data);
    })();
  }, [user]);

  return (
    <>
      <div className="w-fit flex flex-col gap-1 justify-center items-center mb-8 mx-auto">
        <Link to={`/${user}`}>
          <img
            src={userinfo?.avatar_url || SvgPlaceholder}
            className="h-16 w-16 rounded-full"
          />
        </Link>

        <p className="text-neutral-500 text-sm text-center max-w-sm mt-2 dark:text-neutral-300 text-pretty">
          {userinfo?.bio}
        </p>

        <div className="flex gap-2">
          <Badge className="flex gap-1">
            <BookCopy size={16} />
            {userinfo?.public_repos ?? 0}
            <span>Repositories</span>
          </Badge>

          <Link
            to={`https://github.com/${user}?tab=repositories`}
            target="_blank"
          >
            <Badge variant="secondary" className="flex gap-1">
              Github
              <ExternalLink size={16} />
            </Badge>
          </Link>
        </div>
      </div>

      {allDataList.length === 0 && !fetching && (
        <div className="w-full h-60">
          <div
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-12"
            x-chunk="dashboard-02-chunk-1"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">{`You have no repositories.`}</h3>
              <Button className="mt-4" asChild>
                <Link
                  to={`${githubUrl.new}`}
                  target="_blank"
                  className={cn(
                    "flex items-center gap-2 w-fit mx-auto mt-6 text-sm text-gray-600 hover:text-black"
                  )}
                >
                  Create Repository
                  <ExternalLink size={14} className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {allDataList.length === 0 && fetching && (
          <>
            {new Array(9).fill(null).map(() => (
              <Skeleton className="h-28 w-full" />
            ))}
          </>
        )}

        {allDataList.map((it) => (
          <RepoCard key={it.id} user={user} repo={it} />
        ))}

        {hasMore && (
          <Button asChild variant="ghost" onClick={loadMore}>
            <div className="flex flex-col justify-center items-center h-auto w-full p-4 border rounded-lg hover:shadow">
              <Ellipsis />
              {fetching ? "Loading..." : "More"}
            </div>
          </Button>
        )}
      </div>
    </>
  );
}
export default Repos;
