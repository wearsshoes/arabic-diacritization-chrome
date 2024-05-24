import { PageMetadata, TextNode } from '../common/webpageDataClass';
import { calculateHash } from '../common/utils';
import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';
import { AppMessage, AppResponse, ElementAttributes } from '../common/types';
import { mainNode, language } from './content';

let textElements: TextNode[] = [];
let pageMetadata: PageMetadata | null = null;
let diacritizedStatus = 'original';
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

const listener = (request: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse) => void) => {
  console.log('contentUtils received message:', request.action);

  const actionHandlers: Record<string, (message: AppMessage) => Promise<AppResponse>> = {
    'getWebsiteData': handleGetWebsiteData,
    'getWebsiteMetadata': handleGetWebsiteMetadata,
    'getWebsiteText': handleGetWebsiteText,
    'getSelectedNodes': handleGetSelectedNodes,
    'updateWebsiteText': handleUpdateWebsiteText,
    'toggleWidget': async () => ({ status: 'success' }), // Dummy handler to prevent 'Invalid action
    'diacritizationBatchesStarted': async () => ({ status: 'success' }),
  };

  const handler = actionHandlers[request.action];

  if (handler) {
    handler(request)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error(`Error processing ${request.action}:`, error);
        sendResponse({ status: 'error', error: error as Error });
      });
    return true;
  } else {
    console.error(`Invalid action: ${request.action}`);
    sendResponse({ status: 'error', error: new Error('Invalid action') });
  }
};

// ----------------- Functions ----------------- //

async function handleGetWebsiteData(): Promise<AppResponse> {
  console.log({ 'Main node': mainNode, 'PageMetadata': pageMetadata, 'Text elements': textElements });
  const characterCount = mainNode.innerText?.length || 0;
  return { status: 'success', language, characterCount };
}

async function handleGetWebsiteMetadata(): Promise<AppResponse> {
  if (pageMetadata && diacritizedStatus) {
    return { status: 'success', pageMetadata, diacritizedStatus };
  } else {
    throw new Error('No metadata available');
  }
}

async function handleGetWebsiteText(): Promise<AppResponse> {
  console.log('Sending website text:', textElements);
  return { status: 'success', selectedNodes: textElements };
}

async function handleGetSelectedNodes(): Promise<AppResponse> {
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

async function handleUpdateWebsiteText(message: AppMessage): Promise<AppResponse> {
  editingContent = true;
  if (message.replacements && message.method && message.tabUrl === window.location.href) {
    // console.log('listener says ruby is', message.ruby)
    replaceWebpageText(message.replacements, message.ruby);
    diacritizedStatus = message.method;
  } else {
    throw new Error('Could not update website text.');
  }
  editingContent = false;
  return { status: 'success' };
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
      ({ textElements } = getTextElementsAndIndexDOM(mainNode as Node));
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
    // // Disconnect the observer before making DOM changes
    // observer.disconnect();
    // scrapeContent(mainNode)
    //   .finally(() => {
    //     observer.observe(document.body, observerOptions);
    //   })
    //   .catch((error) => {
    //     console.error('Error during scrapeContent:', error);
    //     observer.observe(document.body, observerOptions);
    //   });
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