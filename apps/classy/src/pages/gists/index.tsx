/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { cn, useClassyConfig } from "@classy/lib";
import { githubUrl } from "@classy/shared";
import AllGists from "./allGists";
import SpecifyGists from "./specifyGists";

export function Gists() {
  const { user } = useParams() as { user: string };

  const classyConfig = useClassyConfig(user);

  const defaultType = { name: "All" };

  const gistTypes = classyConfig?.gists?.type || [];

  return (
    <div>
      <h1 className="text-xl text-center">{`${user}'s Gists`}</h1>

      <Tabs className="mx-auto my-6" defaultValue={defaultType.name}>
        <TabsList className={cn("mx-auto")}>
          <TabsTrigger className="px-3" value={defaultType.name}>
            {defaultType.name}
          </TabsTrigger>
          {gistTypes.map((it) => (
            <TabsTrigger className="px-3" key={it.name} value={it.name}>
              {it.name}
            </TabsTrigger>
          ))}
        </TabsList>

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
    </div>
  );
}

export default Gists;
