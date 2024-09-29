/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getGistMatchStr,
  gitApiFetch,
  matchGistRule,
  requestUrl,
  useClassyConfig,
  usePageFetch,
} from "@classy/lib";

import GistCard from "./gistCard";
import GistsEmpty from "./empty";
import { useQueryClient } from "@tanstack/react-query";

const GistSkeleton = () => (
  <div className="flex flex-col space-y-3 my-8">
    <div className="space-y-2">
      <Skeleton className="h-4 w-4/12" />
      <Skeleton className="h-4 w-3/12" />
    </div>
    <Skeleton className="h-[125px] w-full rounded-xl" />
  </div>
);

const SpecifyGists = ({ user, type }: { user: string; type: string }) => {
  const classyConfig = useClassyConfig(user);

  const queryClient = useQueryClient();
  const fetchGists = useCallback(
    async (params?: Record<string, any>) =>
      queryClient.fetchQuery({
        queryKey: ["gists", user, params],
        queryFn: () => gitApiFetch(requestUrl.gists(user), { params }),
      }),
    [user, queryClient]
  );

  const { allDataList, fetching, hasMore, loadMore } = usePageFetch({
    fetchFunc: fetchGists,
  });

  const { prefix, split } = classyConfig.gists;

  const gists = allDataList.filter((it) =>
    matchGistRule(it.description, { prefix, split, type })
  );

  return (
    <>
      {gists.length === 0 && fetching && <GistSkeleton />}

      {gists.length === 0 && !fetching && <GistsEmpty type={type} />}

      <div className="flex flex-col space-y-8 divide-y-2 divide-dashed">
        {gists.map((it) => (
          <GistCard
            key={it.id}
            user={user}
            gist={it}
            title={getGistMatchStr(it.description, { prefix, split, type })}
            type={type}
          />
        ))}
      </div>

      {gists.length > 0 && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={loadMore}
            disabled={!hasMore}
            className="my-2"
          >
            {hasMore ? "Load more" : "- END -"}
          </Button>
        </div>
      )}
    </>
  );
};

export default SpecifyGists;
