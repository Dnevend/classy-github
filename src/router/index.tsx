import App from "@/App";
import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";

export const Router = () => {
  return (
    <Suspense fallback={<>Loading...</>}>
      <Routes>
        <Route index element={<App />} />
      </Routes>
    </Suspense>
  );
};
