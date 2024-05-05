import { useEffect, useState } from 'react';

import { PageMetadata, TextNode } from '../common/dataClass';
import { calculateHash } from '../common/utils';

import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';

export const useContentSetup = () => {
  const [textElements, setTextElements] = useState<TextNode[]>([]);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [diacritizedStatus, setDiacritizedStatus] = useState<string>('original');
  const [mainNode, setMainNode] = useState<HTMLElement>(document.body);
  let editingContent = false;

  useEffect(() => {
    const onContentLoaded = () => {
      console.log('Content loaded');
      setMainNode(document.querySelector('main, #main') as HTMLElement || document.body);
      scrapeContent(mainNode).then(() => {
        chrome.runtime.sendMessage({ action: 'contentLoaded' });
        observer.observe(document.body, observerOptions);
      });
      document.removeEventListener('DOMContentLoaded', onContentLoaded);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onContentLoaded);
    } else {
      onContentLoaded();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', onContentLoaded);
      observer.disconnect();
    };

  }, []);

  // Event listener for messages from background script
  useEffect(() => {
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [textElements, pageMetadata, diacritizedStatus, mainNode]);

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
        setDiacritizedStatus(method);
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
        setPageMetadata(metadata);
        if (diacritizedStatus === 'original') {
          editingContent = true;
          const { textElements } = getTextElementsAndIndexDOM(mainNode as Node);
          setTextElements(textElements);
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

  interface ElementAttributes {
    tagName: string;
    id?: string;
    className?: string; // space separated list of classes, not an array
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

    if (significantChange && !editingContent) {
      console.log('Significant change, reindexing DOM');
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

  const observerOptions = {
    childList: true,
    characterData: true,
    subtree: true,
  };

  return;
};