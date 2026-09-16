import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@metron/ui/styles.css";
import "./styles.css";
import { App } from "./App";
import { LandingPage } from "./pages/landing";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Metron root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === "/" ? <LandingPage /> : <App />}
  </StrictMode>,
);
