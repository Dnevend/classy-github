import Logo from "@/components/logo";
import { useClassyParams } from "@/lib/hooks";
import { Suspense } from "react";
import { Outlet } from "react-router";
import { Link } from "react-router-dom";
import { Loading } from "./loading";

export function NormalLayout() {
  const { user } = useClassyParams();

  return (
    <main
      className="wrapper min-h-screen"
      style={{ gridTemplateRows: "auto 1fr auto" }}
    >
      <header className="full-bleed sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-between items-center mx-auto h-14 px-8 max-w-screen-xl items-center">
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            <Logo />
            <Link to={`/${user}/gists`}>Gists</Link>
          </nav>
          <h1>{user}</h1>
        </div>
      </header>

      <Suspense fallback={<Loading />}>
        <div>
          <Outlet />
        </div>
      </Suspense>

      <footer className="p-2">footer</footer>
    </main>
  );
}

export default NormalLayout;
