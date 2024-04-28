import { useClassyParams } from "@/lib/hooks";
import { gitFetchFunc } from "@/lib/request";
import { cn } from "@/lib/utils";
import { Gist as IGist } from "@/types/github";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CodeRender, MarkdownRender } from "./components";
import { Separator } from "@/components/ui/separator";
import SvgPlaceholder from "@/assets/placeholder.svg";
import Loading from "@/components/loading";

export function Gist() {
  const { gistId } = useClassyParams();

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

  return (
    <div>
      <img
        src={gist?.owner.avatar_url || SvgPlaceholder}
        className="h-16 w-16 mx-auto rounded-full"
      />
      <h1 className="text-center font-bold">
        {gist?.description || `${gist?.owner.login}'s Gist`}
      </h1>
      <p className="text-lg text-center">{gist?.owner.login}</p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-xs text-gray-300">
        <span>{gist?.created_at}</span>
        <span>id: {gistId}</span>
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
              <MarkdownRender>{fileContent[it.filename]}</MarkdownRender>
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
