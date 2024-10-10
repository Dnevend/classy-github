/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from "react";
import { gitApiFetch, requestUrl, usePageFetch } from "@classy/lib";
import { useQueryClient } from "@tanstack/react-query";
import { Gist } from "@classy/types";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Outline = ({ user }: { user: string }) => {
  const queryClient = useQueryClient();
  const fetchGists = useCallback(
    async (params?: Record<string, any>) =>
      queryClient.fetchQuery({
        queryKey: ["gists", user, params],
        queryFn: () => gitApiFetch(requestUrl.gists(user), { params }),
      }),
    [user, queryClient]
  );

  const { datalist, fetching } = usePageFetch<Gist>({
    pageSize: 99,
    fetchFunc: fetchGists,
  });

  const groupList = useMemo(() => {
    const _list: { year: number; list: Gist[] }[] = [];
    datalist
      .map((it) => new Date(it.created_at).getFullYear())
      .filter((it, idx, arr) => arr.indexOf(it) === idx)
      .forEach((year) => {
        _list.push({
          year,
          list: datalist.filter(
            (it) => new Date(it.created_at).getFullYear() === year
          ),
        });
      });
    return _list;
  }, [datalist]);

  return (
    <div className="flex flex-col space-y-8 max-w-full lg:max-w-[80%] mx-auto">
      {fetching && (
        <div className="flex flex-col space-y-3 my-8">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full rounded-xl" />
          <Skeleton className="h-4 w-full rounded-xl" />
          <Skeleton className="h-4 w-full rounded-xl" />
        </div>
      )}

      {groupList.map((it) => (
        <div key={it.year}>
          <h2 className="text-2xl font-bold text-gray-500 mb-2">{it.year}</h2>

          <ul className="flex flex-col space-y-6">
            {it.list.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <Link to={`/${user}/gist/${it.id}`}>
                  <span className="hover:underline cursor-pointer">
                    {it.description}

                    {Object.keys(it.files).length > 1 && (
                      <span className="text-sm text-gray-500 ml-1">
                        [{Object.keys(it.files).length}]
                      </span>
                    )}
                  </span>
                </Link>

                <div className="flex-1 border-b border-dashed hidden sm:block border-gray-200" />

                <span className="text-sm text-gray-500">
                  {it.created_at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Outline;
