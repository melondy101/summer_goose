import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("root element not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA：生产构建注册 Service Worker，装进主屏幕后离线也能玩
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 注册失败不影响网页版游玩
    });
  });
}
