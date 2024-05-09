import { PageMetadata, TextNode } from '../common/webpageDataClass';
import { calculateHash } from '../common/utils';
import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';
import { AppMessage, AppResponse, ElementAttributes } from '../common/types';

console.log('Content being setup');
let textElements: TextNode[] = [];
let pageMetadata: PageMetadata | null = null;
let mainNode = document.body;
let diacritizedStatus = 'original';
let editingContent = false;


const observerOptions = {
  childList: true,
  characterData: true,
  subtree: true,
};

const onContentLoaded = () => {
  console.log('Content loaded');
  mainNode = (document.body.querySelector('main, #main') as HTMLElement || document.body);
  scrapeContent(mainNode).then(() => {
    chrome.runtime.sendMessage({ action: 'contentLoaded' });
    observer.observe(document.body, observerOptions);
  });
  document.removeEventListener('DOMContentLoaded', onContentLoaded);
};

const listener = (request: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse) => void) => {

  const { action, originals, replacements, method } = request;

  console.log('contentUtils received message:', action);
  switch (action) {

    case 'getWebsiteData': {
      console.log({ 'Main node': mainNode, 'PageMetadata': pageMetadata, 'Text elements': textElements });
      const language = document.documentElement.lang;
      const characterCount = mainNode.innerText?.length || 0;
      sendResponse({ status: 'success', language, characterCount });
      return true;
    }

    case 'getWebsiteMetadata':
      if (pageMetadata && diacritizedStatus) {
      sendResponse({ status: 'success', pageMetadata, diacritizedStatus });
      } else {
        sendResponse({ status: 'error', error: new Error('No metadata available') });
      }
      return true;

    case 'getWebsiteText':
      console.log('Sending website text:', textElements);
      sendResponse({ status: 'success', selectedNodes: textElements });
      return true;

    case 'getSelectedNodes': {
      const selection = window.getSelection();
      if (selection !== null) {
        console.log(selection.toString());
        const range = selection.getRangeAt(0);
        const textNodes = getTextNodesInRange(range);
        sendResponse({ status: 'success', selectedNodes: textNodes, diacritizedStatus });
      }
      return true;
    }

    case 'updateWebsiteText' || 'diacritizationChunkFinished':
      console.log('Updating website text', originals, replacements, method);
      editingContent = true;
      if (originals && replacements && method) {
        replaceWebpageText(originals, replacements, method);
        diacritizedStatus = method;
      }
      editingContent = false;
      // TODO: also set whether the whole page is diacritized
      // sendResponse({ method, result: 'success' });
      return false;
  }
};

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
  const content = document.body.querySelector('main')?.querySelectorAll('*') || document.body.querySelectorAll('*')
  const textContent = Array.from(content).map((element) => element.textContent).join("");
  const signature = await calculateHash(textContent);
  return signature;
}

async function summarizeMetadata(): Promise<{ [key: string]: ElementAttributes }> {
  const content = document.body.querySelector('main')?.querySelectorAll('*') || document.body.querySelectorAll('*');
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
    return (
      mutation.type === 'childList' ||
      (mutation.type === 'characterData' && mutation.target.parentElement?.tagName !== 'SCRIPT')
    );
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