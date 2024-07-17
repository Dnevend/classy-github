import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy } from "react";
import App from "@/App";

import { Layout } from "@/layout";
import { userLoader } from "./loader";

const UserPage = lazy(() => import("@/pages/user"));
const Gist = lazy(() => import("@/pages/gist"));
const Gists = lazy(() => import("@/pages/gists"));

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
      { path: "*", element: <UserPage />, loader: userLoader },
      { path: "gists", element: <Gists /> },
      { path: "gist/:gistId", element: <Gist /> },
    ],
  },
]);

export const Router = () => <RouterProvider router={router} />;
