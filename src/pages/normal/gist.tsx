import { useClassyParams, useGist } from "@/lib/hooks";

export function Gist() {
  const { gistId } = useClassyParams();

  const gist = useGist(gistId);

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
