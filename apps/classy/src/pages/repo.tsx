import { MarkdownRender } from "@classy/components";
import { gitFetchFunc } from "@classy/lib";
import { Repo as IRepo, RepoContent } from "@classy/types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function Repo() {
  const { user, repo } = useParams() as { user: string; repo: string };

  const [repository, setRepo] = useState<IRepo | null>(null);
  const [repoContents, setRepoContents] = useState<RepoContent[]>([]);
  const [readme, setReadme] = useState<string>();

  // const rawAddress = https://github.com/Shadowzzh/quick-nav/raw/main/docs/images/view.png

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
    (async () => {
      const data = await fetch(readmeRawUrl);
      if (data.ok) {
        // console.log("text =>", await data.text());
        setReadme(await data.text());
      }
    })();
  }, [repoContents]);

  return (
    <div>
      <h1>{repository?.name}</h1>
      <h3>{repository?.description}</h3>
      <MarkdownRender>{readme}</MarkdownRender>
    </div>
  );
}

export default Repo;
