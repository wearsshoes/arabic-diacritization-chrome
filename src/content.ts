// content.ts
import { TextNode, ListOfTextNodes, PageMetadata, WebPageDiacritizationData } from "./types";
import { calculateContentSignature, serializeStructureMetadata } from "./types";

// -------------- Event Listeners -------------- //

// when queried by popup, returns the language of the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Get the website language (called by popup.ts)
  if (request.action === 'getWebsiteData') {
    const language = document.documentElement.lang;
    
    // this is stupid and I should consider passing it differently
    const totalTextLength = textElements
        .map(node => node.text.length)
      .reduce((acc, curr) => acc + curr, 0);
    sendResponse({language, chars: totalTextLength});
  }
  
  // Get metadata about the website (called by background.ts)
  if (request.action === 'getWebsiteMetadata') {
    const pageUrl = request.pageUrl;
    const structuralMetadata = serializeStructureMetadata(document.body.querySelectorAll('*'));
    const contentSignature = calculateContentSignature(document.body.querySelectorAll('*'));
    if (typeof contentSignature === 'string') {
      const pageMetadata: PageMetadata = {
        lastVisited: new Date,
        contentSignature,
        structuralMetadata
      }
      sendResponse({pageMetadata});
    };
    return true;
  }

  // When diacritization is requested, returns the APIBatches
  if (request.action === "getWebsiteText") {
    sendResponse({data: textElements});
  }

  // Updates website when told to.
  if (request.action === "updateWebsiteText") {
    const data: WebPageDiacritizationData = request.data;
    const method = request.method;
    const original = data.original;
    const diacritization = data.getDiacritization(method);
    if (original && diacritization) {
        replaceTextWithDiacritizedText(original, diacritization, method);
    } else {
      sendResponse({error: 'Original or diacritization not found.'});
    }
    return true;
  }

});

// -------------- Functions -------------- //

// Global Variables
const delimiter:string = '|'
const sentenceRegex = /[.!?؟]+\s*\n*/g; 
let textElements: TextNode[];

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function newRecurseDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): {textElements: TextNode[], iterator: number} {
  const textElements: TextNode[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {
    
    const element = node as Element;
    // elementId = 'element-' + iterator + '-' + element.tagName + '-' + element.id + '-' + element.className;

    if (element.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      elementId = 'element-' + iterator + '-' + element.tagName;
      element.setAttribute('data-element-id', elementId);
      for (const childNode of Array.from(element.childNodes)) {
        const innerText = newRecurseDOM(childNode, innerIndex, elementId, iterator++);
        textElements.push(...innerText.textElements);
        innerIndex += innerText.textElements.length;
        iterator = innerText.iterator;
      }
      index += innerIndex;
    }

  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    const sentences = splitTextIntoSentences(node.textContent);
    const fragment = document.createDocumentFragment();

    sentences.forEach((sentence, sentenceIndex) => {

      const textElement: TextNode = {
        elementId: elementId,
        index: index + sentenceIndex,
        text: sentence,
      };

      textElements.push(textElement);
      
      // it would be a lot more stateful to do this in replaceTextWithDiacritizedText
      // we can move it when we handle serialization/deserialization better.
      const textNode = document.createTextNode(sentence);
      fragment.appendChild(textNode);
      
      iterator++;
    });
    
    // again, do this later.
    node.parentNode?.replaceChild(fragment, node);
  };
  
  return {textElements, iterator};
}

function splitTextIntoSentences(text: string): string[] {
  return text.replace(sentenceRegex, '$&|').split('|').filter(sentence => sentence.trim() !== '');
}

// Checks if node is visible
function isVisible(element: Element): boolean {

  const isDisplayed = (
    window.getComputedStyle(element).display !== 'none' &&
    window.getComputedStyle(element).visibility !== 'hidden'
  );

  return isDisplayed
}

// DOM Manipulation
function replaceTextWithDiacritizedText(original: ListOfTextNodes[], replacement: ListOfTextNodes[], method: string): void {

  if (original.length !== replacement.length) {
    throw new Error('textElements and diacritizedTexts should have the same length.');
  }

    for (let i = 0; i < original.length; i++) {
      const textElement = original[i].textElement;
      const diacritizedText = replacement[i].textElement.text;

    if (typeof textElement.elementId !== 'string' || typeof textElement.index !== 'number') {
      throw new Error(`Invalid textElement at index ${i}: ${JSON.stringify(textElement)}`);
    }

      const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);

      if (element) {
      if (element.childNodes[textElement.index]) {
        element.childNodes[textElement.index].textContent = diacritizedText;
      } else {
        console.warn(`Warning: childNode at index ${textElement.index} does not exist in element with id ${textElement.elementId}.`);
        continue;
      }
    } else {
      console.warn(`Warning: elementId ${textElement.elementId} did not map to any element.`);
    }
  }
  if(method === 'arabizi'){
    directionLTR();
  }
}

// Forces LTR. Only gets called for Arabizi
function directionLTR() {
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
  const style = document.createElement('style')
  style.textContent = `body * {direction: ltr;}`;
  document.head.appendChild(style);
}    

// starts the batch preparer
function main() {
  try {
    const mainNode = document.querySelector('main') || document.body;
    console.log('Main node:', mainNode);
    textElements = newRecurseDOM(mainNode).textElements;
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// -------------- Runtime -------------- //

// Run on script load 
// should maybe set to only run on lang="ar"?
if (document.readyState === "loading") {
  // Wait for loading to finish, otherwise number of elements tends not to converge
  document.addEventListener('DOMContentLoaded', main);
} else {
  // But often, `DOMContentLoaded` has already fired
  main();
}
