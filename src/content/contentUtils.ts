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

  useEffect(() => {
    const onContentLoaded = () => {
      console.log('Content loaded');
      setContentLoaded(true);
      setMainNode(document.querySelector('main, #main') as HTMLElement || document.body);
      chrome.runtime.sendMessage({ action: 'contentLoaded' });
      scrapeContent(mainNode);
      document.removeEventListener('DOMContentLoaded', onContentLoaded);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onContentLoaded);
    } else {
      onContentLoaded();
    }

  }, []);

  // Event listener for messages from background script
  useEffect(() => {
    chrome.runtime.onMessage.addListener(listener);
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

    console.log('Received request for ', action);
    switch (action) {

      case 'getWebsiteData':
        const language = document.documentElement.lang;
        const characterCount = mainNode.innerText?.length || 0;
        sendResponse({ language, characterCount });
        break;

      case 'getWebsiteMetadata':
        sendResponse({ pageMetadata, diacritizedStatus });
        break;

      case 'getWebsiteText':
        sendResponse({ websiteText: textElements });
        break;

      case 'getSelectedNodes':
        const selection = window.getSelection();
        if (selection !== null) {
          console.log(selection.toString());
          const range = selection.getRangeAt(0);
          const textNodes = getTextNodesInRange(range);
          sendResponse({ nodes: textNodes, diacritizedStatus });
        }
        break;

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

  // Scrape webpage data for the content script
  const scrapeContent = async (mainNode: HTMLElement) => {
    try {
      if (diacritizedStatus === 'original') {
        setDiacritizedStatus('initializing');
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

        const { textElements } = getTextElementsAndIndexDOM(mainNode as Node);
        setTextElements(textElements);
        setDiacritizedStatus('original');
        console.log('Text elements:', textElements);
      }
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

    if (contentLoaded && significantChange && diacritizedStatus === 'original') {
      // If a significant change is detected *that wasn't us*, call scrapeContent again
      console.log('Significant change detected:', mutations);
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