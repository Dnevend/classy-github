import Logo from "@/components/logo";
import { Suspense } from "react";
import { Outlet } from "react-router";

export function NormalLayout() {
  return (
    <div className="wrapper">
      <div className="flex justify-between items-center p-2">
        <Logo />
        name
      </div>

      <Suspense fallback={<p className="text-xl">Loading ...</p>}>
        <Outlet />
      </Suspense>

      <div className="p-2">footer</div>
    </div>
  );
}

export default NormalLayout;
