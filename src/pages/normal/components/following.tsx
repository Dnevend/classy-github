import { gitApiFetch, requestUrl } from "@/lib/request";
import { Follower } from "@/types/github";
import { AnimatedTooltip } from "./animated-tooltip";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Following = ({ username }: { username: string }) => {
  const navigate = useNavigate();

  const [followers, setFollowers] = useState<
    { id: number; name: string; designation: string; image: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      const _followings = await gitApiFetch<Follower[]>(
        requestUrl.following(username),
        { alt: [] }
      );

      setFollowers(
        (_followings || []).map((it) => ({
          id: it.id,
          name: it.login,
          designation: "TEST",
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

export default Following;
