/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn, gitApiFetch, requestUrl, usePageFetch } from "@classy/lib";
import { Repo, User } from "@classy/types";
import { BookCopy, Ellipsis, ExternalLink } from "lucide-react";
import { useCallback } from "react";
import { Link, useLoaderData, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { githubUrl } from "@classy/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SvgPlaceholder from "@/assets/placeholder.svg";
import RepoCard from "./RepoCard";

export function Repos() {
  const { user } = useParams() as { user: string };

  const { repos: loaderRepos = [] } = useLoaderData() as { repos?: Repo[] };

  const { data: userinfo = null } = useQuery<User>({
    queryKey: ["user", user],
    queryFn: () => gitApiFetch(requestUrl.user(user), { priority: "low" }),
  });

  const queryClient = useQueryClient();
  const fetchRepos = useCallback(
    async (params?: Record<string, any>) =>
      queryClient.fetchQuery({
        queryKey: ["repos", user, params],
        queryFn: () =>
          gitApiFetch(requestUrl.repos(user), {
            params: { sort: "updated", ...params },
          }),
      }),
    [user, queryClient]
  );

  const { allDataList, hasMore, loadMore, fetching } = usePageFetch({
    pageSize: 100,
    fetchFunc: fetchRepos,
  });

  const showRepos = allDataList.length === 0 ? loaderRepos : allDataList;

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

      {showRepos.length === 0 && !fetching && (
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
        {showRepos.length === 0 && fetching && (
          <>
            {new Array(9).fill(null).map(() => (
              <Skeleton className="h-28 w-full" />
            ))}
          </>
        )}

        {showRepos.map((it) => (
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
