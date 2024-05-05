import React from 'react';
import ReactDOM from 'react-dom/client';

import contentUtils from "./contentUtils";
import ContentOverlay from "./overlay";

import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Create the main container
const appContainer = document.createElement("div");
appContainer.id = "crx-app-container";
document.body.appendChild(appContainer);

// Create a Shadow Root
const shadowRoot = appContainer.attachShadow({ mode: 'open' });

// Create a div for your React app inside the shadow root
const root = document.createElement("div");
root.id = "crx-root";
shadowRoot.appendChild(root);

// Create a custom emotion cache
const shadowHost = shadowRoot; // Your shadow DOM root
const emotionCache = createCache({
  key: 'your-custom-key',
  container: shadowHost
});

// Mount your React app to the shadow root

const reactRoot = ReactDOM.createRoot(root);
reactRoot.render(
  <React.StrictMode>
    <CacheProvider value={emotionCache}>
      <ContentOverlay />
    </CacheProvider>
  </React.StrictMode>
);

window.addEventListener('error', (event) => {
  if (event.message.includes('Failed to fetch dynamically imported module')) {
    window.location.reload();
  }
});

contentUtils()
