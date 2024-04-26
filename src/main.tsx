import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router/index.tsx";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
