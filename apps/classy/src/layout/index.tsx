import Logo from "@/components/logo";
import {
  useClassyParams,
  cn,
  useClassyConfig,
  gitFetchFunc,
} from "@classy/lib";
import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Link } from "react-router-dom";
import { Loading } from "./loading";
import { ExternalLink } from "lucide-react";
import { User } from "@classy/types";
import { Footer } from "./footer";

export function Layout() {
  const { user } = useClassyParams();

  const [userinfo, setUserinfo] = useState<User>();
  console.log("🐞 => Layout => userinfo:", userinfo);
  const classyConfig = useClassyConfig(user);

  useEffect(() => {
    (async () => {
      const data = await gitFetchFunc.userinfo(user);
      setUserinfo(data);
    })();
  }, [user]);

  const { links } = classyConfig;

  const blogUrl = userinfo?.blog.startsWith("http")
    ? userinfo.blog
    : `http://${userinfo?.blog}`;

  return (
    <main
      className="wrapper min-h-screen"
      style={{ gridTemplateRows: "auto 1fr auto" }}
    >
      <header className="full-bleed sticky top-0 z-50 w-full ">
        <div
          className={cn(
            "flex justify-between items-center mx-auto h-14 px-8 max-w-screen-xl",
            "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          )}
        >
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            <Link to="/">
              <Logo />
            </Link>

            <NavLink
              to={`/${user}/gists`}
              className={({ isActive }) =>
                isActive ? "font-bold" : "hover:text-blue-500"
              }
            >
              Gists
            </NavLink>

            {userinfo?.blog && (
              <Link to={blogUrl} target="_blank">
                <p className="flex items-center gap-1 hover:text-blue-500">
                  <span>Website</span>
                  <ExternalLink size={12} />
                </p>
              </Link>
            )}
          </nav>

          <Link to={`/${user}`}>
            <span className="text-lg">
              {userinfo?.name || userinfo?.login || user}
            </span>
          </Link>
        </div>

        <div className="h-8 -mb-8 bg-gradient-to-b from-white dark:from-slate-900 opacity-75" />
      </header>

      <Suspense fallback={<Loading />}>
        <div className="p-6">
          <Outlet />
        </div>
      </Suspense>

      <Footer links={links} />
    </main>
  );
}

export default Layout;
