import { calculateHash } from '../common/utils';
import { AppMessage, AppResponse } from '../common/types';
import { mainNode, language } from './content';
import { TextNode } from '../common/webpageDataClass';
import { arabicToArabizi } from './arabizi';
import { collectTextNodes, labelDOM, replaceWebpageText } from './domUtils';

let editStatus = 'original';
const collectedNodes: TextNode[] = [];
let contentSignature = '';
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
  chrome.storage.sync.get('autoDiacritize', (data) => {
    if (data.autoDiacritize && data.autoDiacritize !== 'off') {
      const autoDiacritize: string = data.autoDiacritize;
      console.log('Auto-diacritizing page.');
      chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processText', method: autoDiacritize, wholePage: true })
    } else {
      console.log('Auto-diacritization is off.');
    }
  });

};

const scrapeContent = async (mainNode: HTMLElement): Promise<void> => {
  contentSignature = await calculateHash(mainNode.innerText || '');
  if (editStatus === 'original') labelCounter = labelDOM(mainNode);
  collectTextNodes(mainNode).forEach((node) => {
    collectedNodes.push(node);
  });
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


  if (significantChange && editStatus === 'original') {
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
}

// ----------------- Handlers ----------------- //

export async function handleGetWebsiteData(): Promise<AppResponse> {

  const characterCount = mainNode.innerText?.length || 0;
  return { status: 'success', language, characterCount };
}

export async function handleGetWebsiteText(): Promise<AppResponse> {

  if (!contentSignature && !editStatus) throw new Error('No page metadata or diacritized status found.');
  const textElements = editStatus === 'original' ? collectTextNodes(mainNode) : collectedNodes;
  if (editStatus === 'original') textElements.forEach((node) => collectedNodes.push(node));
  console.log('Sent collected all text nodes.');
  return { status: 'success', selectedNodes: Array.from(textElements), contentSignature };
}

export async function handleGetSelectedNodes(): Promise<AppResponse> {

  const range = window.getSelection()?.getRangeAt(0);
  const errorMessage = 'No text selected.';
  if (!range) return { status: 'error', errorMessage };

  const ancestor = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  observer.disconnect();
  labelCounter = labelDOM(ancestor ?? document.body, labelCounter);
  observer.observe(document.body, observerOptions);

  const selectedNodes = collectTextNodes(range);
  if (editStatus === 'original') {
    selectedNodes.forEach((node) => collectedNodes.push(node));
  }
  const selectedTexts = Array.from(selectedNodes).map((node) => node.text)
  console.log('Sending selected text for processing:', selectedTexts);
  return { status: 'success', selectedNodes: Array.from(selectedNodes) };
}

export async function handleUpdateWebsiteText(message: AppMessage): Promise<AppResponse> {
  let { replacements } = message;
  const { ruby } = message;
  editStatus = 'changed'

  if (!replacements) throw new Error('Text not provided.');
  if (ruby) replacements = arabicToArabizi(replacements);

  observer.disconnect();
  replaceWebpageText(replacements);
  observer.observe(document.body, observerOptions);
  return { status: 'success' };
}

export default main;