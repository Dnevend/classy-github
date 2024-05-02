import { Gist, GistFile } from "@classy/types/github";
import { ArrowRight, Braces, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SvgLoading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeRender, MarkdownRender } from "@classy/components";

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

export default GistCard;
