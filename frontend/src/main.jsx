import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./css/index.css";
import "./css/style.css";
import "./css/alerts.css";
import "./css/notifications.css";
import "./css/emergency.css";
import "./css/map.css";
import "./css/resources.css";
import "./css/responsive-polish.css";
import "./css/citizen-text.css";
import "./css/authority-text.css";
import "./css/auth-text.css";
import App from "./App";
import { initializeTheme } from "./utils/theme.js";
initializeTheme();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Offline map tile caching could not be enabled:", error);
    });
  }, { once: true });
}
