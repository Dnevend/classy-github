import Logo from "@/components/logo";
import { Suspense } from "react";
import { Outlet } from "react-router";

export function NormalLayout() {
  return (
    <div className="wrapper">
      <div className="full-bleed sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-between items-center mx-auto h-14 px-8 max-w-screen-xl items-center">
          <Logo />
          name
        </div>
      </div>

      <Suspense fallback={<p className="text-xl">Loading ...</p>}>
        <Outlet />
      </Suspense>

      <div className="p-2">footer</div>
    </div>
  );
}

export default NormalLayout;
