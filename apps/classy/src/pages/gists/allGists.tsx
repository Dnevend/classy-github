/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { gitApiFetch, requestUrl, usePageFetch } from "@classy/lib";
import { Pagination } from "@/components/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import GistsEmpty from "./empty";
import GistCard from "./gistCard";
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

const AllGists = ({ user }: { user: string }) => {
  const queryClient = useQueryClient();
  const fetchGists = useCallback(
    async (params?: Record<string, any>) =>
      queryClient.fetchQuery({
        queryKey: ["gists", user, params],
        queryFn: () => gitApiFetch(requestUrl.gists(user), { params }),
      }),
    [user, queryClient]
  );

  const {
    datalist: gists,
    fetching,
    current,
    hasMore,
    goNext,
    goPrev,
  } = usePageFetch({ pageSize: 5, fetchFunc: fetchGists });

  return (
    <>
      <div className="flex flex-col space-y-8 divide-y-2 divide-dashed">
        {(hasMore || current !== 1) && (
          <Pagination
            canGoNext={hasMore}
            canGoPrev={current > 1}
            onNext={goNext}
            onPrev={goPrev}
            className="w-full flex justify-between my-2"
          />
        )}

        {gists.length === 0 && fetching && <GistSkeleton />}

        {gists.length === 0 && !fetching && <GistsEmpty />}

        {gists.map((it) => (
          <GistCard key={it.id} user={user} gist={it} type="all" />
        ))}
      </div>

      {gists.length > 0 && (
        <Pagination
          canGoNext={hasMore}
          canGoPrev={current > 1}
          onNext={goNext}
          onPrev={goPrev}
          className="mx-auto my-2"
        />
      )}
    </>
  );
};

export default AllGists;
