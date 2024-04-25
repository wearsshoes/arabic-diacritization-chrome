import React, { useEffect } from "react";
import ReactDOM from 'react-dom/client';
import { scrapeContent, setupListeners } from "./contentUtils";

const Content: React.FC = () => {
  useEffect(() => {
    scrapeContent();
    setupListeners();
  }, []);

  return null;
};

const root = document.createElement("div");
root.id = "crx-root";
document.body.appendChild(root);

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Content />
  </React.StrictMode>
);