import { gitApiFetch, requestUrl } from "@/lib/request";
import { Follower } from "@/types/github";
import { AnimatedTooltip } from "./animated-tooltip";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Followers = ({ username }: { username: string }) => {
  const navigate = useNavigate();

  const [followers, setFollowers] = useState<
    { id: number; name: string; designation: string; image: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      const _followers = await gitApiFetch<Follower[]>(
        requestUrl.followers(username),
        { alt: [] }
      );

      setFollowers(
        (_followers || []).map((it) => ({
          id: it.id,
          name: it.login,
          designation: "test",
          image: it.avatar_url,
        }))
      );
    })();
  }, [username]);

  return (
    <div className="flex flex-row flex-wrap items-center justify-center mb-10 w-full">
      {followers.length > 0 && (
        <AnimatedTooltip
          items={followers}
          onItemClick={(item) => navigate(`/${item.name}`)}
        />
      )}
    </div>
  );
};

export default Followers;
