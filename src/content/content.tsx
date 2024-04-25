import React, { useEffect } from "react";
import ReactDOM from 'react-dom/client';
import { scrapeContent, setupListeners } from "./contentUtils";
import ContentOverlay from "./overlay";
import { ChakraProvider } from '@chakra-ui/react'

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
    <ChakraProvider>
    <Content />
    <ContentOverlay />
    </ChakraProvider> 
  </React.StrictMode>
);