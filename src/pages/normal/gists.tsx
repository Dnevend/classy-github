import { Button } from "@/components/ui/button";
import { githubUrl } from "@/lib/const";
import { useUserGists } from "@/lib/hooks";
import { ExternalLink } from "lucide-react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";

export function Gists() {
  const { user } = useParams() as { user: string };

  const gists = useUserGists(user);

  return (
    <div>
      <h1>Gists</h1>

      {gists.map((it) => {
        return (
          <div key={it.id}>
            <p>{it.description}</p>
            <a href={`/${user}/gist/${it.id}`} className="text-indigo-600">
              detail
            </a>
          </div>
        );
      })}

      <div>
        <Button asChild>
          <Link to={githubUrl.userGists(user)} target="_blank">
            Create Gist
            <ExternalLink size={12} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
export default Gists;
