import { useClassyParams } from "@/lib/hooks";
import { gitApiFetch, requestUrl } from "@/lib/request";
import { Gist as IGist } from "@/types/github";
import { useEffect, useState } from "react";

export function Gist() {
  const params = useClassyParams();

  const [gist, setGist] = useState<IGist | null>(null);

  useEffect(() => {
    const init = async () => {
      const _gist = await gitApiFetch<IGist>(requestUrl.gist(params.gistId));
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
