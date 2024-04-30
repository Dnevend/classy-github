import Logo from "@/components/logo";
import { Suspense } from "react";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="wrapper">
      <div className="flex justify-between items-center p-2">
        <Logo />
        nes theme
      </div>

      <Suspense fallback={<p className="text-xl">Loading ...</p>}>
        <Outlet />
      </Suspense>

      <div className="p-2">footer</div>
    </div>
  );
}

export default Layout;
