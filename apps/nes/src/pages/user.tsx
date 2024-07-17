import { cn, gitApiFetch, requestUrl, useClassyConfig } from "@classy/lib";
import { Follower, Following, Repo, RepoContent, User } from "@classy/types";
import { Link, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarkdownPreview } from "@classy/components";

const Account = ({
  avatar,
  name,
  onClick,
}: {
  avatar: string;
  name: string;
  onClick: () => void;
}) => {
  return (
    <div className="flex flex-col items-center" onClick={onClick}>
      <img
        className={cn("nes-avatar is-rounded")}
        alt={`${name}'s avatar`}
        src={avatar}
        style={{ imageRendering: "pixelated" }}
      />
      <p>{name}</p>
    </div>
  );
};

export function UserPage() {
  const navigate = useNavigate();
  const { user } = useParams() as { user: string };
  const { userinfo } = useLoaderData() as { userinfo: User | null };
  const classyConfig = useClassyConfig(user);

  const { data: repos = [] } = useQuery<Repo[]>({
    queryKey: ["repos", user, { sort: "updated", per_page: 100 }],
    queryFn: () =>
      gitApiFetch(requestUrl.repos(user), {
        params: {
          sort: "updated",
          per_page: 100,
        },
        priority: "high",
      }),
    select: (data) =>
      data
        .sort((a, b) => {
          const aCount = a.stargazers_count + a.forks_count;
          const bCount = b.stargazers_count + b.forks_count;
          return aCount > bCount ? -1 : 1;
        })
        .slice(0, classyConfig.profile.repos.showCount),
  });

  const { data: followers = [] } = useQuery<Follower[]>({
    queryKey: ["followers", user],
    queryFn: () => gitApiFetch(requestUrl.followers(user), { priority: "low" }),
  });

  const { data: following = [] } = useQuery<Following[]>({
    queryKey: ["following", user],
    queryFn: () => gitApiFetch(requestUrl.following(user), { priority: "low" }),
  });

  const { data: readme } = useQuery<{
    path?: string;
    source?: string;
  } | null>({
    queryKey: ["readme", user],
    queryFn: async () => {
      const repoContents = await gitApiFetch<RepoContent[]>(
        requestUrl.repoContents(user, user),
        { priority: "high" }
      );

      const readmeRawUrl = repoContents?.find(
        (it) => it.name.toLowerCase() === "readme.md"
      )?.download_url;

      if (readmeRawUrl) {
        const data = await fetch(readmeRawUrl);
        if (data.ok) {
          const readme = await data.text();

          return {
            path: readmeRawUrl.substring(0, readmeRawUrl.lastIndexOf("/") + 1),
            source: readme,
          };
        }
      }

      return null;
    },
  });

  return (
    <div className="p-6">
      <div className="nes-container with-title is-centered">
        <p className="title">{userinfo?.login}</p>

        <div className="flex items-center justify-center gap-2">
          <img
            className={cn("nes-avatar is-rounded", "!w-12 !h-12")}
            alt={`${userinfo?.name}'s avatar`}
            src={userinfo?.avatar_url}
            style={{ imageRendering: "pixelated" }}
          />
          <p className="m-0">{userinfo?.name}</p>
        </div>

        <p>{userinfo?.bio}</p>

        <Link to={userinfo?.html_url || ""}>
          <i className="nes-icon github" />
        </Link>
      </div>

      <section>
        {readme?.source && (
          <MarkdownPreview
            source={readme?.source}
            pathRewrite={{ absPath: readme?.path }}
            wrapperElement={{ "data-color-mode": "light" }}
            className="my-6 rounded-md overflow-hidden"
          />
        )}
      </section>

      <section className="mt-12">
        <h2 id="repos">
          <a href="#repos">#</a>
          Repos
        </h2>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {repos.map((it) => (
            <div>{it.name}</div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 id="followers">
          <a href="#followers">#</a>
          Followers
        </h2>
        <div className="flex flex-wrap gap-6 mx-auto">
          {followers.map((it) => (
            <Account
              name={it.login}
              avatar={it.avatar_url}
              onClick={() => navigate(`/${it.login}`)}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 id="following">
          <a href="#following">#</a>
          Following
        </h2>

        <div className="flex flex-wrap gap-6 mx-auto">
          {following.map((it) => (
            <Account
              name={it.login}
              avatar={it.avatar_url}
              onClick={() => navigate(`/${it.login}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default UserPage;
