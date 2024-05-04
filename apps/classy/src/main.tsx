import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router/index.tsx";
import "./globals.css";
import { TooltipProvider } from "./components/ui/tooltip.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  </React.StrictMode>
);
