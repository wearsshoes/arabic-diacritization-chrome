import { useEffect, useState } from 'react';

import { PageMetadata, TextNode } from '../common/dataClass';
import { calculateHash } from '../common/utils';

import { getTextElementsAndIndexDOM, replaceWebpageText, getTextNodesInRange } from './domUtils';

export const useContentSetup = () => {
  const [contentLoaded, setContentLoaded] = useState<boolean>(false);
  const [textElements, setTextElements] = useState<TextNode[]>([]);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [diacritizedStatus, setDiacritizedStatus] = useState<string>('original');

  // Event listener for messages from background script
  useEffect(() => {
    const listener = (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {

      console.log('Received request for ', request);

      const { original, diacritization, method }: {
        original: TextNode[],
        diacritization: string[],
        method: string
      } = request;

      switch (request.action) {

        // Get the website state (called by popup.ts)
        case 'getWebsiteData':
          waitForContentLoaded.then(() => {
            const language = document.documentElement.lang;
            const mainNode = document.querySelector('main, #main') as HTMLElement || document.body;
            const characterCount = mainNode.innerText?.length || 0;
            sendResponse({ language, characterCount });
            scrapeContent(mainNode);
          });
          return true;

      // Get metadata about the website (called by background.ts)
      case 'getWebsiteMetadata':
        if (pageMetadata) {
          sendResponse({ pageMetadata, diacritizedStatus });
        } else {
          console.error('Metadata not found.');
          sendResponse({ error: 'Metadata not found.' });
        }
        return true;

      // When diacritization is requested, returns the APIBatches
      case 'getWebsiteText':
        sendResponse({ websiteText: textElements });
        return true;

      // When diacritization is requested, returns the selected elements
      // Assumes that the webpage was already processed
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

    chrome.runtime.onMessage.addListener(listener);

    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [contentLoaded, textElements, pageMetadata, diacritizedStatus]);

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

  const waitForContentLoaded = new Promise<void>((resolve) => {
    if (contentLoaded) {
      resolve();
    } else {
      const onContentLoaded = () => {
        setContentLoaded(true);
        resolve();
      };
      document.addEventListener('DOMContentLoaded', onContentLoaded, { once: true });
    }
  });

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

  return;
};