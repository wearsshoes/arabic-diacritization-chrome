import { PageMetadata } from '../common/webpageDataClass';
import { calculateHash } from '../common/utils';
import { labelDOM, replaceWebpageText, collectTextNodes } from './domUtils';
import { AppMessage, AppResponse } from '../common/types';
import { mainNode, language } from './content';
import { arabicToArabizi } from "../background/arabizi";

const pageMetadata: PageMetadata = {
  pageUrl: '',
  lastVisited: new Date(),
};
// TODO: re-implement diacritizedStatus tracking; currently static
const diacritizedStatus = 'original';

const observerOptions: MutationObserverInit = {
  childList: true,
  characterData: true,
  subtree: true,
};

const onContentLoaded = () => {
  document.removeEventListener('DOMContentLoaded', onContentLoaded);
  console.log(`Easy Peasy Arabizi: \nLanguage: ${language} \nMain node: "${mainNode.tagName} ${mainNode.id} ${mainNode.className} ${mainNode.role}"`);
  if (language === 'ar') {
    scrapeContent(mainNode).then(() => {
      chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'contentLoaded' });
      observer.observe(document.body, observerOptions);
    });
  }
};

const listener = (message: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse | void) => void) => {

  const actionHandlers: Record<string, (message: AppMessage) => Promise<AppResponse> | Promise<void>> = {
    'getWebsiteData': handleGetWebsiteData,
    'getWebsiteText': handleGetWebsiteText,
    'getWebsiteMetadata': handleGetWebsiteMetadata,
    'getSelectedNodes': handleGetSelectedNodes,
    'updateWebsiteText': handleUpdateWebsiteText,
    // Dummy handlers to prevent 'Invalid action' #TODO: remove these
    'allDone': async () => { },
    'updateProgressBar': async () => { },
    'toggleWidget': async () => { },
    'beginProcessing': async () => { },
  };

  const handler = actionHandlers[message.action];

  if (handler) {
    handler(message)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error(`Error processing ${message.action}:`, error);
        sendResponse({ status: 'error', error: error as Error });
      });
    return true;
  } else {
    console.error(`Invalid action: ${message.action}`);
    sendResponse({ status: 'error', error: new Error('Invalid action') });
  }
};

// ----------------- Functions ----------------- //

export async function handleGetWebsiteData(): Promise<AppResponse> {
  console.log({ 'Main node': mainNode, 'PageMetadata': pageMetadata });
  const characterCount = mainNode.innerText?.length || 0;
  return { status: 'success', language, characterCount };
}

export async function handleGetWebsiteMetadata(): Promise<AppResponse> {
  if (pageMetadata && diacritizedStatus) {
    return { status: 'success', pageMetadata, diacritizedStatus };
  } else {
    throw new Error('No metadata available');
  }
}

export async function handleGetWebsiteText(): Promise<AppResponse> {
  const textElements = collectTextNodes(mainNode);
  console.log('Sending website text:', textElements);
  return { status: 'success', selectedNodes: textElements };
}

export async function handleGetSelectedNodes(): Promise<AppResponse> {
  const range = window.getSelection()?.getRangeAt(0);
  if (!range) return { status: 'error', error: new Error('No text selected.') };
  const selectedNodes = collectTextNodes(range);
  return { status: 'success', selectedNodes, diacritizedStatus };
}

export async function handleUpdateWebsiteText(message: AppMessage): Promise<AppResponse> {
  const { ruby } = message;
  let { replacements } = message;

  if (!replacements) throw new Error('Text not provided.');
  if (ruby) replacements = arabicToArabizi(replacements);

  observer.disconnect();
  replaceWebpageText(replacements);
  observer.observe(document.body, observerOptions);
  return { status: 'success' };
}

// Scrape webpage data for the content script
const scrapeContent = async (mainNode: HTMLElement): Promise<void> => {
  pageMetadata.contentSignature = await calculateHash(mainNode.textContent || '');
  if (diacritizedStatus === 'original') labelDOM(mainNode);
};

const observer = new MutationObserver((mutations) => {
  // Check if the mutations indicate a significant content change

  const significantChange = mutations.some((mutation) => {
    const targetElement = mutation.target instanceof Element ? mutation.target : null;
    const isMainContentChange = targetElement?.closest(mainNode.tagName);
    const isNotWidget = !targetElement?.closest('crx-app-container');
    const isChildListChange = mutation.type === 'childList';
    const isCharacterDataChange = mutation.type === 'characterData' && targetElement?.parentElement?.tagName !== 'SCRIPT';

    return isNotWidget && isMainContentChange && (isChildListChange || isCharacterDataChange);
  });

  if (significantChange && diacritizedStatus === 'original') {
    console.log('Significant change, reindexing DOM', diacritizedStatus, mutations);

    observer.disconnect();
    scrapeContent(mainNode)
      .finally(() => {
        observer.observe(document.body, observerOptions);
      })
      .catch((error) => {
        console.error('Error during scrapeContent:', error);
      });
  }
});

// MAIN
const main = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onContentLoaded);
  } else {
    onContentLoaded();
  }
  chrome.runtime.onMessage.addListener(listener);
}

export default main;