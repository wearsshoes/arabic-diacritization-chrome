import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import theme from './widget_theme';
import ContentWidget from "./widget";
import contentUtils from "./contentUtils";

const hasArabic = /\[\\u0600-\\u06FF\]/;
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

createRoot(shadowRoot).render(
  <CacheProvider value={emotionCache}>
    <ChakraProvider theme={theme}>
      <ContentWidget siteLanguage={language} />
    </ChakraProvider>
  </CacheProvider>
);

contentUtils();