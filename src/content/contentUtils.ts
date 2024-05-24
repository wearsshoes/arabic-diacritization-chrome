import { PageMetadata, TextNode } from '../common/webpageDataClass';
import { calculateHash } from '../common/utils';
import { labelDOM, collectElements, replaceWebpageText, getTextNodesInRange } from './domUtils';
import { AppMessage, AppResponse, ElementAttributes } from '../common/types';
import { mainNode, language } from './content';
import { arabicToArabizi } from "../background/arabizi";

let textElements: TextNode[] = [];
let pageMetadata: PageMetadata | null = null;
// TODO: re-implement diacritizedStatus tracking; currently static
const diacritizedStatus = 'original';
let editingContent = false;

const observerOptions = {
  childList: true,
  characterData: true,
  subtree: true,
};

const onContentLoaded = () => {
  document.removeEventListener('DOMContentLoaded', onContentLoaded);
  console.log(`EasyPeasy Arabeasy extension: \nLanguage: ${language}, main node: "${mainNode.tagName} ${mainNode.id} ${mainNode.className} ${mainNode.role}"`);
  if (language === 'ar') {
    scrapeContent(mainNode).then(() => {
      chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'contentLoaded' });
      observer.observe(document.body, observerOptions);
    });
  }
};

const listener = (message: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse) => void) => {

  const actionHandlers: Record<string, (message: AppMessage) => Promise<AppResponse>> = {
    'getWebsiteData': handleGetWebsiteData,
    'getWebsiteMetadata': handleGetWebsiteMetadata,
    'getWebsiteText': handleGetWebsiteText,
    'getSelectedNodes': handleGetSelectedNodes,
    'updateWebsiteText': handleUpdateWebsiteText,
    // Dummy handlers to prevent 'Invalid action'
    'allDone': async () => ({ status: 'success' }),
    'updateProgressBar': async () => ({ status: 'success' }),
    'toggleWidget': async () => ({ status: 'success' }),
    'beginProcessing': async () => ({ status: 'success' }),
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
  console.log({ 'Main node': mainNode, 'PageMetadata': pageMetadata, 'Text elements': textElements });
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
  console.log('Sending website text:', textElements);
  return { status: 'success', selectedNodes: textElements };
}

export async function handleGetSelectedNodes(): Promise<AppResponse> {
  const selection = window.getSelection();
  if (selection !== null) {
    console.log(selection.toString());
    const range = selection.getRangeAt(0);
    const textNodes = getTextNodesInRange(range);
    return { status: 'success', selectedNodes: textNodes, diacritizedStatus };
  } else {
    throw new Error('No selection available');
  }
}

export async function handleUpdateWebsiteText(message: AppMessage): Promise<AppResponse> {
  const { ruby } = message;
  let { replacements } = message;

  if (!replacements) throw new Error('Text not provided.');
  if (ruby) replacements = arabicToArabizi(replacements);

  try {
    editingContent = true;
    replaceWebpageText(replacements);
    return { status: 'success' };
  } finally {
    editingContent = false;
  }
}

// Scrape webpage data for the content script
const scrapeContent = async (mainNode: HTMLElement): Promise<void> => {
  try {
    const structuralMetadata = await summarizeMetadata();
    const contentSignature = await calculateContentSignature();

    const metadata: PageMetadata = {
      pageUrl: window.location.href,
      lastVisited: new Date(),
      contentSignature,
      structuralMetadata,
    };

    pageMetadata = metadata;

    if (diacritizedStatus === 'original') {
      editingContent = true;
      labelDOM(mainNode);
      (textElements = collectElements(mainNode));
      console.log('Scraped text elements:', textElements);
      editingContent = false;
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    editingContent = false;
    throw error;
  }
};

async function calculateContentSignature(): Promise<string> {
  // for any *remotely* dynamic content, this will be different every time
  // might be able to do it as part of newRecurseDOM
  const content = mainNode.querySelectorAll('*');
  const textContent = Array.from(content).map((element) => element.textContent).join("");
  const signature = await calculateHash(textContent);
  return signature;
}

async function summarizeMetadata(): Promise<{ [key: string]: ElementAttributes }> {
  const content = mainNode.querySelectorAll('*');
  const elementAttributes: { [summary: string]: ElementAttributes } = {};
  const contentSummaries: string[] = [];

  content.forEach((element) => {
    const { tagName, id, className, textContent = "" } = element;
    const summary = `${tagName}${id}${className}${textContent}`;
    elementAttributes[summary] = { tagName, id, className };
    contentSummaries.push(summary);
  });

  // Hash all the content summaries at once, and then remap them onto the element attributes
  const contentKeys = await calculateHash(contentSummaries);

  return Object.fromEntries(
    contentKeys.map((key, index) => [key, elementAttributes[contentSummaries[index]]])
  );
}

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

  if (significantChange && !editingContent && diacritizedStatus === 'original') {
    console.log('Significant change, reindexing DOM', editingContent, diacritizedStatus, mutations);
    // Disconnect the observer before making DOM changes
    observer.disconnect();
    scrapeContent(mainNode)
      .finally(() => {
        observer.observe(document.body, observerOptions);
      })
      .catch((error) => {
        console.error('Error during scrapeContent:', error);
        observer.observe(document.body, observerOptions);
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