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
let labelCounter = 0;

const observerOptions: MutationObserverInit = {
  childList: true,
  characterData: true,
  subtree: true,
};

const onContentLoaded = () => {
  document.removeEventListener('DOMContentLoaded', onContentLoaded);
  console.log(`Easy Peasy Arabizi: \nLanguage: ${language} \nMain node: "${mainNode.tagName} ${mainNode.id} ${mainNode.className} ${mainNode.role}"`);
  if (language === 'ar') {
    scrapeContent(mainNode)
      .then(() => {
        observer.observe(document.body, observerOptions);
      });
  }
};

const scrapeContent = async (mainNode: HTMLElement): Promise<void> => {
  pageMetadata.contentSignature = await calculateHash(mainNode.innerText || '');
  if (diacritizedStatus === 'original') labelCounter = labelDOM(mainNode);
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

const observer = new MutationObserver((mutations) => {

  const significantChange = mutations.some((mutation) => {
    const targetElement = mutation.target as HTMLElement;

    const conditions = [
      !targetElement?.closest('crx-app-container'),
      !targetElement?.closest('iframe'),
      !targetElement?.tagName.includes('figure'),
      !targetElement?.closest('figure'),
      !targetElement?.closest('svg'),
      targetElement?.closest(mainNode.tagName),
      mutation.type === 'childList',
      Array.from(mutation.addedNodes).some((node) => node instanceof HTMLElement && node.innerText)
    ];

    return conditions.every(Boolean);
  });


  if (significantChange && diacritizedStatus === 'original') {

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.innerText && node.innerText.length > 0) {
          observer.disconnect();
          labelCounter = labelDOM(node, labelCounter);
          observer.observe(document.body, observerOptions);
        }
      });
    });
  }
});

const main = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onContentLoaded);
  } else {
    onContentLoaded();
  }
  chrome.runtime.onMessage.addListener(listener);
}

// ----------------- Functions ----------------- //

export async function handleGetWebsiteData(): Promise<AppResponse> {
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

export default main;