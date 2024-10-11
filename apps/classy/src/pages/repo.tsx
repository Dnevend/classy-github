import { gitApiFetch, requestUrl } from "@classy/lib";
import { Repo as IRepo, RepoContent } from "@classy/types";
import { PropsWithChildren, useEffect, useState } from "react";
import {
  Link,
  To,
  useLoaderData,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Eye, GitFork, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isAbsolutePath } from "@classy/lib";
import { MarkdownPreview } from "@classy/components";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useQuery } from "@tanstack/react-query";

const LinkBadge = ({ to, children }: PropsWithChildren<{ to: To }>) => (
  <Link to={to} target="_blank">
    <Badge
      className="gap-1 hover:bg-black hover:text-slate-50"
      variant="outline"
    >
      {children}
    </Badge>
  </Link>
);

export function Repo() {
  const [params] = useSearchParams();
  const { user, repo } = useParams() as { user: string; repo: string };
  const { repository } = useLoaderData() as { repository: IRepo | null };
  const { theme } = useThemeMode();

  // 目标渲染文件
  const [renderFile, setRenderFile] = useState<string | null>(
    params.get("file")
  );

  // 目标渲染文件路径
  const relativePath =
    renderFile?.substring(0, renderFile.lastIndexOf("/") + 1) ?? "";

  const [absPath, setAbsPath] = useState<string>();
  const [renderContent, setRenderContent] = useState<string>();

  const { data: repoContents } = useQuery({
    queryKey: ["repoContents", user, repo],
    queryFn: () =>
      gitApiFetch<RepoContent[]>(requestUrl.repoContents(user, repo), {
        alt: [],
      }),
  });

  useEffect(() => {
    // FIXME: 调整匹配规则 README.md > other.md > readme.other > ./docs/README.md > ./docs/other.md
    const readmeRawUrl = repoContents?.find((it) =>
      it.name.toLowerCase().includes("readme")
    )?.download_url;

    if (!readmeRawUrl) return;

    const absPath = readmeRawUrl.substring(
      0,
      readmeRawUrl.lastIndexOf("/") + 1
    );
    setAbsPath(absPath);

    // 当指定了渲染的文件时，不再进行README文件渲染
    if (renderFile) return;

    (async () => {
      const data = await fetch(readmeRawUrl);
      if (data.ok) {
        const content = await data.text();
        setRenderContent(content);

        // 当内容指向另一个markdown文件地址时，获取指向文件内容
        if (content.trim().endsWith("md")) {
          setRenderFile(content.trim());
        }
      }
    })();
  }, [repoContents, renderFile]);

  useEffect(() => {
    if (!absPath || !renderFile) return;

    (async () => {
      // 获取目标文件内容
      const data = await fetch(
        isAbsolutePath(renderFile) ? renderFile : `${absPath}${renderFile}`
      );
      if (data.ok) {
        const content = await data.text();
        setRenderContent(content);
      }
    })();
  }, [renderFile, absPath]);

  return (
    <>
      <div>
        {repository ? (
          <div className="flex flex-col gap-2">
            <h1 className="text-center font-bold">{repository?.name}</h1>

            {repository.homepage && (
              <Link
                to={repository.homepage}
                target="_blank"
                className="w-fit flex justify-center items-center gap-1 text-sm text-slate-500 mx-auto"
              >
                <span className="underline">{repository.homepage}</span>
                <ExternalLink size={14} />
              </Link>
            )}

            <p className="text-sm text-center text-slate-500">
              {repository?.description}
            </p>

            <div className="w-fit mx-auto flex gap-2">
              <LinkBadge to={repository.html_url}>
                <Eye size={16} />
                {repository?.watchers_count}
              </LinkBadge>

              <LinkBadge to={repository.html_url}>
                <GitFork size={16} />
                {repository?.forks_count}
              </LinkBadge>

              <LinkBadge to={repository.html_url}>
                <Star size={16} />
                {repository?.stargazers_count}
              </LinkBadge>
            </div>
          </div>
        ) : (
          <div className="w-fit flex flex-col items-center space-y-3 mx-auto">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
        )}
      </div>

      <div className="my-6 px-2">
        {renderContent ? (
          <MarkdownPreview
            source={renderContent}
            pathRewrite={{ absPath, relativePath }}
            wrapperElement={{ "data-color-mode": theme }}
          />
        ) : (
          <div className="flex flex-col space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-[125px] w-full rounded-xl" />
          </div>
        )}
      </div>
    </>
  );
}

export default Repo;
