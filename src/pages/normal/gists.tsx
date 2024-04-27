import { gitApiFetch, requestUrl } from "@/lib/request";
import { Gist } from "@/types/github";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export function Gists() {
  const params = useParams() as { user: string };
  const [gists, setGists] = useState<Gist[]>([]);

  useEffect(() => {
    const init = async () => {
      const _gists = await gitApiFetch<Gist[]>(requestUrl.gists(params.user), {
        alt: [],
      });
      setGists(_gists!);
    };
    init();
  }, [params]);

  return (
    <div>
      <h1>Default gists page</h1>
      <h2>username: {params.user}</h2>

      {gists.map((it) => {
        return (
          <div key={it.id}>
            <p>{it.description}</p>
            <a
              href={`/${params.user}/gist/${it.id}`}
              className="text-indigo-600"
            >
              detail
            </a>
          </div>
        );
      })}
    </div>
  );
}
export default Gists;
