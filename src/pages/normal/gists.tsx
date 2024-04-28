/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { githubUrl } from "@/lib/const";
import { gitFetchFunc } from "@/lib/request";
import { cn } from "@/lib/utils";
import { Gist } from "@/types/github";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const GistCard = ({ user, gist }: { user: string; gist: Gist }) => {
  const files = useMemo(
    () =>
      Object.entries(gist.files).map(([, data]) => ({
        ...data,
      })),
    [gist]
  );

  const [showFile, setShowFile] = useState<string>(files[0].filename);

  const [content, setContent] = useState<Record<string, any>>({});

  useEffect(() => {
    const rawUrl = files.find((it) => it.filename === showFile)?.raw_url;

    if (!rawUrl || content[showFile]) return;

    const loadFile = async () => {
      const res = await fetch(rawUrl);

      const _content = await res.text();
      setContent({ ...content, [showFile]: _content });
    };

    loadFile();
  }, [files, showFile, content]);

  return (
    <div key={gist.id} className="p-2 rounded-md hover:shadow">
      <div className="flex justify-between">
        <Link to={`/${user}/gist/${gist.id}`} className="hover:text-indigo-600">
          {gist.description}
        </Link>

        <p>{gist.created_at}</p>
      </div>

      <ToggleGroup
        type="single"
        defaultValue={showFile}
        className="justify-start my-2"
        onValueChange={(v) => setShowFile(v)}
      >
        {files.map((it) => (
          <ToggleGroupItem key={it.filename} value={it.filename}>
            {it.filename}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div dangerouslySetInnerHTML={{ __html: content[showFile] }} />
    </div>
  );
};

export function Gists() {
  const { user } = useParams() as { user: string };

  const [tab, setTab] = useState<string>("all");
  const [gists, setGists] = useState<Gist[]>([]);

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.userGists(user);
      setGists(data!);
    })();
  }, [user]);

  return (
    <div>
      <h1 className="text-xl text-center">{`${user}'s Gists`}</h1>

      <Tabs
        defaultValue={tab}
        className="w-[300px] mx-auto my-6"
        onValueChange={(v) => setTab(v)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {gists.map((it) => (
          <GistCard key={it.id} user={user} gist={it} />
        ))}
      </div>

      <Link
        to={githubUrl.userGists(user)}
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
