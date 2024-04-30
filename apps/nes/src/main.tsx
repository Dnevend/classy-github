import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router/index.tsx";
import "./globals.css";
import "nes.css/css/nes.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
