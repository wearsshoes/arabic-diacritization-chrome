import { useEffect, useState } from 'react';

import { PageMetadata, TextNode } from '../common/dataClass';
import { calculateHash } from '../common/utils';

import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';

export const useContentSetup = () => {
  const [contentLoaded, setContentLoaded] = useState<boolean>(false);
  const [textElements, setTextElements] = useState<TextNode[]>([]);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [diacritizedStatus, setDiacritizedStatus] = useState<string>('original');
  const [mainNode, setMainNode] = useState<HTMLElement>(document.body);

  // Event listener for messages from background script
  useEffect(() => {
    chrome.runtime.onMessage.addListener(listener);
    waitForContentLoaded;
    observer.observe(mainNode, observerOptions);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      observer.disconnect();
    };
  }, [contentLoaded, textElements, pageMetadata, diacritizedStatus]);

  const listener = (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {

    const { action, original, diacritization, method }: {
      action: string,
      original: TextNode[],
      diacritization: string[],
      method: string
    } = request;
    const language = document.documentElement.lang;
    const characterCount = mainNode.innerText?.length || 0;

    console.log('Received request for ', action);
    switch (action) {

      case 'getWebsiteData':
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
          sendResponse({ nodes: textNodes, diacritizedStatus });
        }
        return true;

      case 'updateWebsiteText' || 'diacritizationChunkFinished':
        setDiacritizedStatus(`inProgress:${method}`)
        replaceWebpageText(original, diacritization, method).then(() => {
          setDiacritizedStatus(method);
          // TODO: also set whether the whole page is diacritized
          sendResponse({ success: 'Text replaced.' });
        });
        return true;
    }
  };

  const waitForContentLoaded = new Promise<void>((resolve) => {
    if (contentLoaded) {
      resolve();
    } else {
      const onContentLoaded = () => {
        setContentLoaded(true);
        setMainNode(document.querySelector('main, #main') as HTMLElement || document.body);
        scrapeContent(mainNode);
        chrome.runtime.sendMessage({ action: 'contentLoaded' });
        resolve();
      };
      document.addEventListener('DOMContentLoaded', onContentLoaded, { once: true });
    }
  });

  // Scrape webpage data for the content script
  const scrapeContent = async (mainNode: HTMLElement) => {
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
      console.log('Initializing...', metadata);
      if (diacritizedStatus === 'original') {
        const { textElements } = getTextElementsAndIndexDOM(mainNode as Node);
        setTextElements(textElements);
      }
      console.log('Text elements:', textElements);
    } catch (error) {
      console.error('Error during initialization:', error);
    }
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

    if (significantChange && diacritizedStatus === 'original') {
      // If a significant change is detected, call scrapeContent again
      scrapeContent(mainNode);
    }
  });

  const observerOptions = {
    childList: true,
    characterData: true,
    subtree: true,
  };

  return;
};