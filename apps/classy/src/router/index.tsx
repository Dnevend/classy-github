import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy } from "react";

import App from "@/App";

import { Layout } from "@/layout";
import { useThemeMode } from "@/hooks/useThemeMode";
import { gistLoader, repoLoader, reposLoader, userLoader } from "./loader";

const UserPage = lazy(() => import("@/pages/user"));
const Gists = lazy(() => import("@/pages/gists"));
const Gist = lazy(() => import("@/pages/gist"));
const Repos = lazy(() => import("@/pages/repos"));
const Repo = lazy(() => import("@/pages/repo"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <>Error</>,
  },

  {
    path: "/:user/*",
    element: <Layout />,
    loader: userLoader,
    children: [
      {
        path: "*",
        element: <UserPage />,
        loader: userLoader,
      },
      { path: "gists", element: <Gists /> },
      { path: "gist/:gistId", element: <Gist />, loader: gistLoader },
      { path: "repos", element: <Repos />, loader: reposLoader },
      { path: "repo/:repo", element: <Repo />, loader: repoLoader },
    ],
  },
]);

export const Router = () => {
  useThemeMode();
  return <RouterProvider router={router} />;
};
