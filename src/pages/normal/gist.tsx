import { apiFetch, requestUrl } from "@/lib/request";
import { Gist as IGist } from "@/types/github";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export function Gist() {
  const params = useParams() as { gistId: string };
  const [gist, setGist] = useState<IGist | null>(null);

  useEffect(() => {
    const init = async () => {
      const _gist = await apiFetch<IGist>(requestUrl.gist(params.gistId));
      setGist(_gist);
    };
    init();
  }, [params]);

  return (
    <div>
      <h1>gist</h1>
      <h2>id: {params.gistId}</h2>
      <p>{gist?.node_id}</p>
      <p>{gist?.description}</p>
      <p>{gist?.url}</p>
      <p>{gist?.created_at}</p>
    </div>
  );
}
export default Gist;
