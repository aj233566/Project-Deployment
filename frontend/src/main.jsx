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
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
