/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { cn } from "@classy/lib";
import { githubUrl } from "@classy/shared";
import AllGists from "./components/allGists";
import SpecifyGists from "./components/specifyGists";
import { useGistsType } from "./hooks/useGistsType";

export function Gists() {
  const { user } = useParams() as { user: string };

  const { defaultType, gistTypes, getDefaultType, onChangeType } =
    useGistsType(user);

  return (
    <>
      <Tabs
        className="mx-auto my-2"
        defaultValue={getDefaultType()}
        onValueChange={(v) => onChangeType(v)}
      >
        <div className="flex items-center justify-end">
          <TabsList>
            <TabsTrigger className="px-3 capitalize" value={defaultType.name}>
              {defaultType.name}
            </TabsTrigger>
            {gistTypes.map((it) => (
              <TabsTrigger
                className="px-3 capitalize"
                key={it.name}
                value={it.name}
              >
                {it.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={defaultType.name}>
          <AllGists user={user} />
        </TabsContent>

        {gistTypes.map((it) => (
          <TabsContent key={it.name} value={it.name}>
            <SpecifyGists user={user} type={it.name} />
          </TabsContent>
        ))}
      </Tabs>

      <Link
        to={`${githubUrl.gists}/${user}`}
        target="_blank"
        className={cn(
          "flex items-center gap-2 w-fit mx-auto mt-6 text-sm text-gray-600 hover:text-black"
        )}
      >
        Create Gist
        <ExternalLink size={12} />
      </Link>
    </>
  );
}

export default Gists;
