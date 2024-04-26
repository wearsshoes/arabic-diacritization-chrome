import { PageMetadata, TextNode } from "../common/dataClass";
import { ElementAttributes } from "../common/types";
import { calculateHash } from "../common/utils";
import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from "./domUtils";

// Global Variables
let textElements: TextNode[];
let pageMetadata: PageMetadata;

// Event listener for messages from background script
export const setupListeners = () => {
  const listener = async (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    
    // Get the website language (called by popup.ts)
    if (request.action === 'getWebsiteData') {
      console.log('Received request for website data...');
      await scrapeContent();
      const metadataReady = !!(pageMetadata && textElements);
      const language = document.documentElement.lang;
      let totalTextLength = 0;
      if (textElements) {
        totalTextLength = textElements
        .map(textNode => textNode.text.length)
        .reduce((acc, curr) => acc + curr, 0);
      }
      sendResponse({ language, chars: totalTextLength, metadataReady });
    }

    // Get metadata about the website (called by background.ts)
    if (request.action === 'getWebsiteMetadata') {
      console.log('Received request for website metadata...');
      if (pageMetadata) {
        sendResponse(pageMetadata);
      } else {
        console.error('Metadata not found.');
        sendResponse({ error: 'Metadata not found.' });
      }
      return true;
    }

    // When diacritization is requested, returns the APIBatches
    if (request.action === "getWebsiteText") {
      console.log('Received request for website text...');
      sendResponse(textElements);
    }

    // When diacritization is requested, returns the selected elements
    // Assumes that the webpage was already processed
    if (request.action === "getSelectedNodes") {
      const selection = window.getSelection();
      if (selection !== null) {
        console.log(selection.toString());
        const range = selection.getRangeAt(0);
        const textNodes = getTextNodesInRange(range);
        sendResponse({ nodes: textNodes });
      }
    }

    if (request.action === "diacritizationChunkFinished") {
      const { original, diacritization, method } = request;
      console.log("updating:", original, diacritization, method);
      if (original && diacritization && method) {
        replaceWebpageText(original, diacritization, method);
        sendResponse({ success: 'Text replaced.' });
      } else {
        console.error('Original or diacritization or method not found.');
        sendResponse({ error: 'Original or diacritization or method not found.' });
      }
      return true;
    }

    // Updates website when told to.
    if (request.action === "updateWebsiteText") {
      console.log('Received request to update website text...');
      const { original, diacritization, method }: { 
        original: TextNode[], 
        diacritization: string[], 
        method: string 
      } = request;
      console.log("updating:", original, diacritization, method);
      if (original && diacritization && method) {
        replaceWebpageText(original, diacritization, method);
        sendResponse({ success: 'Text replaced.' });
      } else {
        sendResponse({ error: 'Original or diacritization or method not found.' });
      }
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(listener);

  // Clean up the listener when the component unmounts
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

// Scrape webpage data for the content script
const scrapeContent = async () => {
  const main = async () => {
    try {
      const structuralMetadata = await serializeStructureMetadata();
      await calculateContentSignature().then((contentSignature) => {
        pageMetadata = {
          pageUrl: window.location.href,
          lastVisited: new Date(),
          contentSignature,
          structuralMetadata
        };
      });
      console.log('Initializing...', pageMetadata);
      const mainNode = document.querySelector('main, #main') || document.body;
      console.log('Main node:', mainNode);
      textElements = getTextElementsAndIndexDOM(mainNode).textElements;
      console.log('Text elements:', textElements);
    } catch (error) {
      console.error('Error during initialization:', error);
    };
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
    // }
  };
};

async function calculateContentSignature(): Promise<string> {
  // for any *remotely* dynamic content, this will be different every time
  // might be able to do it as part of newRecurseDOM
  const content = document.body.querySelector('main')?.querySelectorAll('*') || document.body.querySelectorAll('*')
  console.log('Calculating content signature...');
  const textContent = Array.from(content).map((element) => element.textContent).join("");
  const signature = await calculateHash(textContent);
  console.log('Content signature:', signature);
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

  return { textElements, pageMetadata };
};