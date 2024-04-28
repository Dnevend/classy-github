import { useClassyParams } from "@/lib/hooks";
import { gitFetchFunc } from "@/lib/request";
import { Gist as IGist } from "@/types/github";
import { useEffect, useState } from "react";

export function Gist() {
  const { gistId } = useClassyParams();
  const [gist, setGist] = useState<IGist | null>(null);

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.gist(gistId);
      setGist(data);
    })();
  }, [gistId]);

  return (
    <div>
      <h1>gist</h1>
      <h2>id: {gistId}</h2>
      <p>{gist?.node_id}</p>
      <p>{gist?.description}</p>
      <p>{gist?.url}</p>
      <p>{gist?.created_at}</p>
    </div>
  );
}
export default Gist;
