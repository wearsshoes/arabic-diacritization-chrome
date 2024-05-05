import { PageMetadata, TextNode } from '../common/dataClass';
import { calculateHash } from '../common/utils';
import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';

console.log('Content being setup');
let textElements: TextNode[] = [];
let pageMetadata: PageMetadata | null = null;
let mainNode = document.body;
let diacritizedStatus = 'original';
let editingContent = false;

interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}

const observerOptions = {
  childList: true,
  characterData: true,
  subtree: true,
};

const onContentLoaded = () => {
  console.log('Content loaded');
  mainNode = (document.querySelector('main, #main') as HTMLElement || document.body);
  scrapeContent(mainNode).then(() => {
    chrome.runtime.sendMessage({ action: 'contentLoaded' });
    observer.observe(document.body, observerOptions);
  });
  document.removeEventListener('DOMContentLoaded', onContentLoaded);
};

const listener = (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {

  const { action, originals, replacements, method }: {
    action: string,
    originals: TextNode[],
    replacements: TextNode[],
    method: string
  } = request;

  console.log('contentUtils received message:', action);
  switch (action) {

    case 'getWebsiteData':
      console.log({ 'Main node': mainNode, 'PageMetadata': pageMetadata, 'Text elements': textElements });
      const language = document.documentElement.lang;
      const characterCount = mainNode.innerText?.length || 0;
      sendResponse({ language, characterCount });
      return true;

    case 'getWebsiteMetadata':
      sendResponse({ pageMetadata, diacritizedStatus });
      return true;

    case 'getWebsiteText':
      sendResponse({ websiteText: textElements });
      return true;

    case 'getSelectedNodes':
      const selection = window.getSelection();
      if (selection !== null) {
        console.log(selection.toString());
        const range = selection.getRangeAt(0);
        const textNodes = getTextNodesInRange(range);
        sendResponse({ selectedNodes: textNodes, diacritizedStatus });
      }
      return true;

    case 'updateWebsiteText' || 'diacritizationChunkFinished':
      console.log('Updating website text', originals, replacements, method);
      editingContent = true;
      replaceWebpageText(originals, replacements, method);
      diacritizedStatus = method;
      editingContent = false;
      // TODO: also set whether the whole page is diacritized
      // sendResponse({ method, result: 'success' });
      return false;
  }
};

// Scrape webpage data for the content script
const scrapeContent = async (mainNode: HTMLElement) => {
  return new Promise<void>(async (resolve, reject) => {
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
        resolve();
        editingContent = false;
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      reject(error);
      editingContent = false;
    }
  });
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