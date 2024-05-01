/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gist, GistFile } from "@classy/types/github";
import { ArrowRight, Braces, ExternalLink, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SvgLoading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeRender, MarkdownRender } from "@classy/components";

import {
  cn,
  getGistMatchStr,
  gitFetchFunc,
  matchGistRule,
  useClassyConfig,
  usePageFetch,
} from "@classy/lib";
import { githubUrl } from "@classy/shared";
import { Pagination } from "@/components/pagination";
import Loading from "@/components/loading";

const GistCard = ({
  user,
  gist,
  title,
  type,
}: {
  user: string;
  gist: Gist;
  title?: string;
  type: string;
}) => {
  const files = useMemo(
    () =>
      Object.entries(gist.files).map(([, data]) => ({
        ...data,
      })),
    [gist]
  );

  const [preview, setPreview] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentFile, setCurrentFile] = useState<GistFile>(files[0]);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});
  const currentFileContent = fileContent[currentFile.filename];

  useEffect(() => {
    if (!currentFile?.raw_url || fileContent[currentFile.filename]) return;

    const loadFile = async () => {
      try {
        setLoading(true);
        const res = await fetch(currentFile.raw_url);
        const _content = await res.text();
        setFileContent({
          ...fileContent,
          [currentFile.filename]: _content,
        });
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [currentFile, fileContent]);

  return (
    <div key={gist.id} className="p-2 rounded-md hover:shadow">
      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
          <img src={gist.owner.avatar_url} className="h-10 w-10 rounded-full" />
          <div>
            <p className="text-gray-800">{gist.owner.login}</p>
            <p className="text-sm text-gray-500">{gist.created_at}</p>
          </div>
        </div>
        <Link
          to={`/${user}/gist/${gist.id}?type=${type}`}
          className="hover:text-indigo-600"
        >
          {title || gist.description || <ArrowRight />}
        </Link>
      </div>

      <ToggleGroup
        type="single"
        defaultValue={currentFile.filename}
        className="justify-start my-2 mt-4"
        onValueChange={(filename) => {
          if (!filename) return;
          setCurrentFile(files.find((it) => it.filename === filename)!);
        }}
      >
        {files.map((it) => (
          <ToggleGroupItem key={it.filename} value={it.filename}>
            {it.filename}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {loading && (
        <div className="h-24 flex justify-center items-center">
          <SvgLoading />
        </div>
      )}

      {currentFile.language === "Markdown" && (
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? <Braces size={16} /> : <Eye size={16} />}
          </Button>
        </div>
      )}

      {currentFile.language === "Markdown" && preview ? (
        <MarkdownRender>{currentFileContent}</MarkdownRender>
      ) : (
        <CodeRender>{currentFileContent}</CodeRender>
      )}
    </div>
  );
};

const AllGists = ({ user }: { user: string }) => {
  const fetchPageData = useCallback(
    (params?: Record<string, any>) => {
      return gitFetchFunc.userGists(user, params);
    },
    [user]
  );

  const {
    datalist: gists,
    fetching,
    current,
    hasMore,
    goNext,
    goPrev,
  } = usePageFetch({ pageSize: 5, fetchFunc: fetchPageData });

  return (
    <>
      <div className="flex flex-col gap-2">
        <Pagination
          canGoNext={hasMore}
          canGoPrev={current > 1}
          onNext={goNext}
          onPrev={goPrev}
          className="w-full flex justify-between my-2"
        />

        {gists.length === 0 && fetching && (
          <div className="w-full h-24 flex justify-center items-center">
            <Loading />
          </div>
        )}

        {gists.map((it) => (
          <GistCard key={it.id} user={user} gist={it} type="all" />
        ))}
      </div>

      <Pagination
        canGoNext={hasMore}
        canGoPrev={current > 1}
        onNext={goNext}
        onPrev={goPrev}
        className="mx-auto my-2"
      />
    </>
  );
};

const FilterGists = ({ user, type }: { user: string; type: string }) => {
  const classyConfig = useClassyConfig(user);

  const fetchPageData = useCallback(
    (params?: Record<string, any>) => {
      return gitFetchFunc.userGists(user, params);
    },
    [user]
  );

  const { allDataList, fetching, hasMore, loadMore } = usePageFetch({
    fetchFunc: fetchPageData,
  });

  const { prefix, split } = classyConfig.gists;

  const gists = allDataList.filter((it) =>
    matchGistRule(it.description, { prefix, split, type })
  );

  return (
    <>
      {gists.length === 0 && fetching && (
        <div className="w-full h-24 flex justify-center items-center">
          <Loading />
        </div>
      )}

      <div className="flex flex-col gap-2">
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

      <div className="text-center">
        <Button
          variant="ghost"
          onClick={loadMore}
          disabled={!hasMore}
          className="my-2"
        >
          {hasMore ? "Load more" : "No more"}
        </Button>
      </div>
    </>
  );
};

export function Gists() {
  const { user } = useParams() as { user: string };

  return (
    <div>
      <h1 className="text-xl text-center">{`${user}'s Gists`}</h1>

      <Tabs className="mx-auto my-6" defaultValue="all">
        <TabsList className="w-[300px] grid grid-cols-2 mx-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllGists user={user} />
        </TabsContent>
        <TabsContent value="blog">
          <FilterGists user={user} type="blog" />
        </TabsContent>
      </Tabs>

      <Link
        to={`${githubUrl.gists}/${user}`}
        target="_blank"
        className={cn(
          "flex items-center gap-2 w-fit mx-auto mt-8 text-sm text-gray-600 hover:text-black"
        )}
      >
        Create Gist
        <ExternalLink size={12} />
      </Link>
    </div>
  );
}
export default Gists;
