import { gitFetchFunc } from "@classy/lib";
import { Repo as IRepo, RepoContent } from "@classy/types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MarkdownPreview from "@uiw/react-markdown-preview";

function replaceRelativePathsWithAbsolute(
  markdownString: string,
  absolutePath: string
) {
  // 正则表达式用于匹配相对路径，这里假设相对路径是以"./"或者"../"开头的
  var regex = /\]\((\.\/|\.\.\/)(.*?)\)/g;

  // 使用replace方法将匹配到的相对路径替换为绝对路径
  var replacedString = markdownString.replace(
    regex,
    "](" + absolutePath + "/$2)"
  );

  return replacedString;
}

function replaceRelativePathsInHTML(
  markdownString: string,
  absolutePath: string
) {
  // 正则表达式用于匹配HTML标签中的相对路径
  var regex =
    /(<(?:img|a)\s+(?:[^>]*?\s+)?(?:src|href)\s*=\s*['"])(\.\/|\.\.\/)([^'"]+)(['"])/gi;

  // 使用replace方法将匹配到的相对路径替换为绝对路径
  var replacedString = markdownString.replace(
    regex,
    function (match, p1, p2, p3, p4) {
      return p1 + absolutePath + "/" + p3 + p4;
    }
  );

  return replacedString;
}

export function Repo() {
  const { user, repo } = useParams() as { user: string; repo: string };

  const [repository, setRepo] = useState<IRepo | null>(null);
  const [repoContents, setRepoContents] = useState<RepoContent[]>([]);
  const [readme, setReadme] = useState<string>();

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
    const readmeRawUrl = repoContents.find((it) =>
      it.name.toLowerCase().includes("readme")
    )?.download_url;

    if (!readmeRawUrl) return;

    const absPath = readmeRawUrl.substring(0, readmeRawUrl.lastIndexOf("/"));

    (async () => {
      const data = await fetch(readmeRawUrl);
      if (data.ok) {
        let _readme = await data.text();
        _readme = replaceRelativePathsWithAbsolute(_readme, absPath);
        _readme = replaceRelativePathsInHTML(_readme, absPath);
        setReadme(_readme);
      }
    })();
  }, [repoContents]);

  return (
    <div>
      <h1 className="text-center">{repository?.name}</h1>
      <p className="text-sm text-center text-slate-500">
        {repository?.description}
      </p>
      <div className="my-6">
        <MarkdownPreview source={readme} />
      </div>
    </div>
  );
}

export default Repo;
