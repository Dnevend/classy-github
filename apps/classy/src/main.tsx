import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router/index.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "nprogress/nprogress.css";
import NProgress from "nprogress";
import "./globals.css";

const queryClient = new QueryClient();

NProgress.configure({ showSpinner: false });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
