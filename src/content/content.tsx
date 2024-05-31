import { createRoot } from 'react-dom/client';
import { AppMessage, AppResponse } from '../common/types';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import theme from './widget_theme';
import ContentWidget from "./widget";
import contentUtils from "./contentUtils";
import { handleGetWebsiteData, handleGetWebsiteText, handleGetSelectedNodes, handleUpdateWebsiteText } from "./contentUtils";

const hasArabic = /[\u0600-\u06FF]/;
export const mainNode = (
  document.body.querySelector('main, #main') as HTMLElement
  ?? document.body.querySelector('#root') as HTMLElement
  ?? document.body
);
export const language = document.documentElement.lang || (hasArabic.test(document.body.innerText) ? 'ar' : 'en');

// Create the main container
const appContainer = document.createElement("div");
appContainer.id = "crx-app-container";
document.body.appendChild(appContainer);

// Create the shadow root
const shadowRoot = appContainer.attachShadow({ mode: 'open' });
const emotionCache = createCache({
  key: 'crx-emotion',
  container: shadowRoot,
});

function dispatchCustomEvent(action: string, strLength?: number) {
  const event = new CustomEvent(action, { detail: { strLength } });
  document.dispatchEvent(event);
}

function setupChromeMessageListener() {
  const actionHandlers: Record<string, (message: AppMessage) => Promise<AppResponse> | Promise<void>> = {
    'getWebsiteData': handleGetWebsiteData,
    'getWebsiteText': handleGetWebsiteText,
    'getSelectedNodes': handleGetSelectedNodes,
    'updateWebsiteText': handleUpdateWebsiteText,
  };

  const eventActions = ['webpageDone', 'updateProgressBar', 'toggleWidget', 'beginProcessing'];

  chrome.runtime.onMessage.addListener((message: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse | void) => void) => {
    const { action, strLength } = message;

    if (eventActions.includes(action)) {
      dispatchCustomEvent(action, strLength);
      sendResponse({ status: 'success' });
    } else {
      const handler = actionHandlers[action];

      handler?.(message)
        .then((response) => sendResponse(response))
        .catch((error) => {
          console.error(`Error processing ${action}:`, error);
          sendResponse({ status: 'error', errorMessage: error.message });
        });
    }

    return true;
  });
}

createRoot(shadowRoot).render(
  <CacheProvider value={emotionCache}>
    <ChakraProvider theme={theme}>
      <ContentWidget siteLanguage={language} />
    </ChakraProvider>
  </CacheProvider>
);

setupChromeMessageListener();
contentUtils();