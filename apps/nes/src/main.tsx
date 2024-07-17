import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router/index.tsx";
import "./globals.css";
import "nes.css/css/nes.min.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  </React.StrictMode>
);
