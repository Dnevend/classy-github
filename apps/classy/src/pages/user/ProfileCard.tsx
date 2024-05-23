import UserCard from "@/components/user-card";
import { cn } from "@classy/lib";
import { User } from "@classy/types";
import { Link } from "react-router-dom";

export const ProfileCard = ({
  user,
  userinfo,
}: {
  user: string;
  userinfo: User | null;
}) => {
  return (
    <>
      <UserCard userinfo={userinfo} />

      <div className="w-full mx-auto flex gap-2 mt-2">
        <Link
          to={`/${user}/repos`}
          className={cn(
            "w-full flex flex-col items-center py-2 px-6 border rounded-lg hover:shadow-sm",
            "bg-gray-50 dark:bg-black dark:border-white/[0.2]"
          )}
        >
          <span>Repos</span>
          <strong>{userinfo?.public_repos}</strong>
        </Link>

        <Link
          to={`/${user}/gists`}
          className={cn(
            "w-full flex flex-col items-center py-2 px-6 border rounded-lg hover:shadow-sm",
            "bg-gray-50 dark:bg-black dark:border-white/[0.2]"
          )}
        >
          <span>Gists</span>
          <strong>{userinfo?.public_gists}</strong>
        </Link>
      </div>
    </>
  );
};
