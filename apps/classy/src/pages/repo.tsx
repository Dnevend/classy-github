import { gitFetchFunc } from "@classy/lib";
import { Repo as IRepo, RepoContent } from "@classy/types";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, GitFork, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isAbsolutePath } from "@classy/lib";
import { Element } from "@types/hast";

/**
 * Review Address
 * /ant-design/repo/ant-design
 * /React95/repo/React95
 * /WaylonWalker/repo/WaylonWalker
 */

export function Repo() {
  const [params] = useSearchParams();
  const { user, repo } = useParams() as { user: string; repo: string };

  // 目标渲染文件
  const [renderFile, setRenderFile] = useState<string | null>(
    params.get("path")
  );
  // 目标渲染文件路径
  const relativePath =
    renderFile?.substring(0, renderFile.lastIndexOf("/") + 1) ?? "";

  const [repository, setRepo] = useState<IRepo | null>(null);
  const [repoContents, setRepoContents] = useState<RepoContent[]>([]);
  const [absPath, setAbsPath] = useState<string>();
  const [renderContent, setRenderContent] = useState<string>();

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.userRepo(user, repo);
      setRepo(data);
    })();

    (async () => {
      const data = await gitFetchFunc.repoContents(user, repo);
      setRepoContents(data);
    })();
  }, [user, repo]);

  useEffect(() => {
    // FIXME: 调整匹配规则 README.md > other.md > readme.other > ./docs/README.md > ./docs/other.md
    const readmeRawUrl = repoContents.find((it) =>
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
            <h1 className="text-center">{repository?.name}</h1>
            <p className="text-sm text-center text-slate-500">
              {repository?.description}
            </p>

            <div className="w-fit mx-auto flex gap-2">
              <Link to={repository.html_url} target="_blank">
                <Badge
                  className="gap-1 hover:bg-black hover:text-slate-50"
                  variant="outline"
                >
                  <Eye size={16} />
                  {repository?.watchers_count}
                </Badge>
              </Link>
              <Link to={repository.html_url} target="_blank">
                <Badge
                  className="gap-1 hover:bg-black hover:text-slate-50"
                  variant="outline"
                >
                  <GitFork size={16} />
                  {repository?.forks_count}
                </Badge>
              </Link>
              <Link to={repository.html_url} target="_blank">
                <Badge
                  className="gap-1 hover:bg-black hover:text-slate-50"
                  variant="outline"
                >
                  <Star size={16} />
                  {repository?.stargazers_count}
                </Badge>
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-fit flex flex-col space-y-3 mx-auto">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}
      </div>

      <div className="my-6">
        {renderContent ? (
          <MarkdownPreview
            source={renderContent}
            rehypeRewrite={(node: Element) => {
              if (node.tagName === "img") {
                const { src, height, style = "" } = node.properties;

                if (Number.isInteger(height)) {
                  node.properties.style = `${style} height: ${height}px`;
                }

                if (src && !isAbsolutePath(String(src))) {
                  node.properties.src = `${absPath}${relativePath}${src}`;
                }
              }

              if (node.tagName === "a") {
                const { href } = node.properties;
                if (
                  href &&
                  !String(href).startsWith("#") &&
                  !isAbsolutePath(String(href))
                ) {
                  node.properties.href = `?file=${relativePath}${href}`;
                }
              }
            }}
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
