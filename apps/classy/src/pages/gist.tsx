import {
  gitFetchFunc,
  useClassyParams,
  cn,
  useClassyConfig,
  matchGistRule,
  getGistMatchStr,
} from "@classy/lib";

import { Gist as IGist } from "@classy/types/github";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import SvgPlaceholder from "@/assets/placeholder.svg";
import Loading from "@/components/loading";
import { CodeRender, MarkdownPreview } from "@classy/components";

export function Gist() {
  const [params] = useSearchParams();
  const { user, gistId } = useClassyParams();
  const classyConfig = useClassyConfig(user);

  const [gist, setGist] = useState<IGist | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({});

  const files = useMemo(
    () =>
      Object.entries(gist?.files || {}).map(([, data]) => ({
        ...data,
      })),
    [gist]
  );

  useEffect(() => {
    files.forEach(async (file) => {
      const res = await fetch(file.raw_url);
      const content = await res.text();
      setFileContent((v) => ({ ...v, [file.filename]: content }));
    });
  }, [files]);

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.gist(gistId);
      setGist(data);
    })();
  }, [gistId]);

  const gistType = params.get("type");
  const { prefix, split } = classyConfig.gists;

  const isGistMatchRule =
    gistType &&
    matchGistRule(gist?.description, { prefix, split, type: gistType });

  const getTitle = () => {
    if (isGistMatchRule) {
      return getGistMatchStr(gist?.description, {
        prefix,
        split,
        type: gistType,
      });
    }
    return gist?.description || `${gist?.owner.login ?? "User"}'s Gist`;
  };

  return (
    <div>
      <img
        src={gist?.owner.avatar_url || SvgPlaceholder}
        className="h-16 w-16 mx-auto rounded-full"
      />
      <h1 className="mt-2 text-center font-bold">{getTitle()}</h1>
      {isGistMatchRule && (
        <p className="mt-1 text-sm text-center text-gray-300">
          {gist?.description}
        </p>
      )}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-1 text-xs text-gray-300">
        <span>{gist?.owner.login}</span>
        <span>{gist?.created_at}</span>
      </div>

      <div className="flex flex-col gap-4 my-6">
        {files.map((it) => (
          <div className="border rounded-md hover:shadow overflow-hidden p-2">
            <div className="flex justify-between items-center py-2">
              <p>{it.filename}</p>
            </div>

            <Separator />

            {!fileContent[it.filename] && (
              <div className="h-24 flex justify-center items-center">
                <Loading />
              </div>
            )}

            {it.language === "Markdown" ? (
              <MarkdownPreview
                source={fileContent[it.filename]}
                className="px-6"
              />
            ) : (
              <CodeRender>{fileContent[it.filename]}</CodeRender>
            )}
          </div>
        ))}
      </div>

      <Link
        to={gist?.html_url || ""}
        target="_blank"
        className={cn(
          "flex items-center gap-2 w-fit mx-auto mt-8 text-sm text-gray-600 hover:text-black"
        )}
      >
        Open in Github
        <ExternalLink size={12} />
      </Link>
    </div>
  );
}
export default Gist;
