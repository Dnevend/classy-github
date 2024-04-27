import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy } from "react";
import App from "@/App";

import { NormalLayout } from "@/pages/normal/layout";
import { NesLayout } from "@/pages/nes/layout";

const UserPage = lazy(() => import("@/pages/normal/user"));
const Gist = lazy(() => import("@/pages/normal/gist"));
const Gists = lazy(() => import("@/pages/normal/gists"));

const NesUserPage = lazy(() => import("@/pages/nes/user"));
const NesGist = lazy(() => import("@/pages/nes/gist"));
const NesGists = lazy(() => import("@/pages/nes/gists"));

const useRouter = () => {
  return createBrowserRouter([
    {
      path: "/",
      element: <App />,
      errorElement: <>Error</>,
    },

    {
      path: "/:user/*",
      element: <NormalLayout />,
      children: [
        { path: "*", element: <UserPage /> },
        { path: "gists", element: <Gists /> },
        { path: "gist/:gistId", element: <Gist /> },
      ],
    },

    {
      path: "/nes/:user/*",
      element: <NesLayout />,
      children: [
        { path: "*", element: <NesUserPage /> },
        { path: "gists", element: <NesGists /> },
        { path: "gist/:gistId", element: <NesGist /> },
      ],
    },
  ]);
};

export const Router = () => {
  const router = useRouter();

  return <RouterProvider router={router} />;
};
