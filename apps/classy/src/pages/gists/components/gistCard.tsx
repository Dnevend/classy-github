import { Gist, GistFile } from "@classy/types/github";
import { Braces, ChevronsDown, Eye } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SvgLoading from "@/components/loading";
import { CodeRender, MarkdownPreview } from "@classy/components";
import { cn, getGistMatchStr, useClassyConfig } from "@classy/lib";
import { useExpand } from "../hooks/useExpand";
import { useThemeMode } from "@/hooks/useThemeMode";

const ContentExpandHeight = 200;

const GistCard = ({ user, gist }: { user: string; gist: Gist }) => {
  const classyConfig = useClassyConfig(user);
  const { prefix, split } = classyConfig.gists;

  const files = useMemo(
    () =>
      Object.entries(gist.files).map(([, data]) => ({
        ...data,
      })),
    [gist]
  );
  const { theme } = useThemeMode();
  const contentRef = useRef<HTMLDivElement>(null);

  const { expand, isOverflow, toggleExpand } = useExpand({
    domTarget: contentRef.current,
    overflowHeight: ContentExpandHeight,
  });

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
    <div key={gist.id} id={gist.id} className="p-2 rounded-md hover:shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <img src={gist.owner.avatar_url} className="h-10 w-10 rounded-full" />
          <Link
            to={`/${user}/gist/${gist.id}`}
            className="hover:text-indigo-600"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {getGistMatchStr(gist.description, { prefix, split }) ||
                  "View Detail"}
              </h2>
              <p className="text-sm text-gray-500">{gist.created_at}</p>
            </div>
          </Link>
        </div>

        {currentFile.language === "Markdown" && (
          <button className="p-2" onClick={() => setPreview((v) => !v)}>
            {preview ? <Braces size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {files.length > 1 && (
        <ul className="flex flex-wrap gap-2 py-4">
          {files.map((it) => (
            <li
              key={it.filename}
              onClick={() => setCurrentFile(it)}
              className={cn(
                `${
                  currentFile.filename === it.filename
                    ? "text-black font-semibold"
                    : "text-gray-500"
                } hover:underline hover:decoration-wavy cursor-pointer`
              )}
            >
              {it.filename}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={contentRef}
        className={cn("overflow-hidden relative rounded-md", {
          "max-h-[288px]": isOverflow && !expand,
        })}
      >
        {loading && (
          <div className="h-24 flex justify-center items-center">
            <SvgLoading />
          </div>
        )}

        <div
          className={cn("p-2 mt-4 transition-all", {
            "grayscale opacity-35": isOverflow && !expand,
          })}
          style={{
            height: isOverflow && !expand ? `${ContentExpandHeight}px` : "auto",
          }}
        >
          {currentFile.language === "Markdown" && preview ? (
            <MarkdownPreview
              source={currentFileContent}
              wrapperElement={{ "data-color-mode": theme }}
            />
          ) : (
            <div className="rounded-md overflow-hidden">
              <CodeRender theme={theme === "dark" ? "a11yDark" : "a11yLight"}>
                {currentFileContent}
              </CodeRender>
            </div>
          )}
        </div>

        {isOverflow && (
          <div
            className={cn(
              "flex justify-center items-center bg-transparent cursor-pointer",
              {
                "relative h-28 bg-gradient-to-b from-transparent to-black/10 hover:to-black/50":
                  isOverflow && !expand,
              }
            )}
            onClick={() => {
              toggleExpand();

              window.scrollTo({
                top: document.getElementById(gist.id)?.offsetTop || 0,
                behavior: "smooth",
              });
            }}
          >
            <ChevronsDown
              className={cn({
                "animate-bounce-slow": !expand,
                "rotate-180": expand,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GistCard;
