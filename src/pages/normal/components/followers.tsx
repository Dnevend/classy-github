import { AnimatedTooltip } from "./animated-tooltip";
import { useNavigate } from "react-router-dom";
import { useUserFollowers } from "@/lib/hooks";

export const Followers = ({ username }: { username: string }) => {
  const navigate = useNavigate();

  const followers = useUserFollowers(username);

  const items = followers.map((it) => ({
    id: it.id,
    name: it.login,
    designation: "test",
    image: it.avatar_url,
  }));

  return (
    <div className="flex flex-row flex-wrap items-center justify-center mb-10 w-full">
      {items.length > 0 && (
        <AnimatedTooltip
          items={items}
          onItemClick={(item) => navigate(`/${item.name}`)}
        />
      )}
    </div>
  );
};

export default Followers;
