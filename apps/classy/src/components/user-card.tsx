import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { Link } from "react-router-dom";
import { User } from "@classy/types/github";
import SvgPlaceholder from "@/assets/placeholder.svg";
import { Github, Mail, Twitter, UserRound } from "lucide-react";

export const UserCard = ({ userinfo }: { userinfo: User | null }) => {
  return (
    <CardContainer className="inter-var">
      <CardBody className="bg-gray-50 relative group/card  dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[20rem] h-auto rounded-xl p-6 border  ">
        <CardItem translateZ="100" className="flex justify-between w-full mt-4">
          <div>
            <h1 className="text-xl font-bold">{userinfo?.name}</h1>
            <h2>{userinfo?.login}</h2>
          </div>
          <img
            src={userinfo?.avatar_url || SvgPlaceholder}
            height="1000"
            width="1000"
            className="h-10 w-10 object-cover rounded-full group-hover/card:shadow-xl"
            alt="thumbnail"
          />
        </CardItem>

        <CardItem
          translateZ="50"
          className="flex justify-center items-center dark:text-white"
        >
          <>
            <UserRound size={16} className="mr-1" />
            {
              <>
                <span className="text-neutral-500 font-bold">
                  {userinfo?.followers}
                </span>
                <span className="indent-1 text-xs font-normal text-neutral-400">
                  followers
                </span>
              </>
            }
            <span className="mx-1">·</span>
            {
              <>
                <span className="text-neutral-500 font-bold">
                  {userinfo?.following}
                </span>
                <span className="indent-1 text-xs font-normal text-neutral-400">
                  following
                </span>
              </>
            }
          </>
        </CardItem>

        <CardItem
          as="p"
          translateZ="60"
          className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
        >
          {userinfo?.bio || "bio"}
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          <img
            src={userinfo?.avatar_url || SvgPlaceholder}
            height="1000"
            width="1000"
            className="h-40 w-full object-cover rounded-xl group-hover/card:shadow-xl"
            alt="thumbnail"
          />
        </CardItem>
        <div className="flex justify-between items-center mt-10">
          <div className="flex justify-center items-center gap-1 py-1">
            {userinfo?.twitter_username && (
              <CardItem
                translateZ={20}
                as={Link}
                to={`https://twitter.com/${userinfo.twitter_username}`}
                target="_blank"
                className="px-1 rounded-xl dark:text-white text-black text-xs font-bold"
              >
                <Twitter size={18} />
              </CardItem>
            )}
            {userinfo?.email && (
              <CardItem
                translateZ={20}
                as={Link}
                // TODO:
                to={"mailto:" + userinfo.email}
                target="_blank"
                className="px-1 rounded-xl dark:text-white text-black text-xs font-bold"
              >
                <Mail size={18} />
              </CardItem>
            )}
          </div>
          <CardItem
            translateZ={20}
            as={Link}
            to={userinfo?.html_url || ""}
            target="_blank"
            className="px-1 py-1 rounded-xl dark:text-white text-black text-xs font-bold"
          >
            <Github size={18} />
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
};

export default UserCard;
