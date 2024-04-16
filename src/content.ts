// content.ts
import { TextNode, PageMetadata, DiacritizationRequestBatch, ProcessorResponse, WebPageDiacritizationData, ElementAttributes } from "./types";
import { calculateContentSignature, serializeStructureMetadata } from "./types";

// -------------- Event Listeners -------------- //

// when queried by popup, returns the language of the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Get the website language (called by popup.ts)
  if (request.action === 'getWebsiteData') {
    const language = document.documentElement.lang;
    
    // this is stupid and I should consider passing it differently
    const totalTextLength = textElementBatches
      .map(element => element
        .map(node => node.text.length)
        .reduce((acc, curr) => acc + curr, 0))
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
    sendResponse({data: textElementBatches});
  }

  // Updates website when told to.
  if (request.action === "updateWebsiteText") {
    const result: ProcessorResponse[] = request.data;
    const method = request.method;
    if (textElementBatches.length ===result.length) {
      textElementBatches.forEach((batch, batchIndex) => {
        console.log('Replacing text with diacritized text:', method);
        const diacritizedTexts = result[batchIndex].diacritizedTexts;
        replaceTextWithDiacritizedText(batch, diacritizedTexts, method);
      });
    } else {
      sendResponse({error: 'Mismatch between textElementBatches and result length.'});
    }
    return true;
  }

});

// -------------- Functions -------------- //

// Global Variables
const delimiter:string = '|'
const sentenceRegex = /[.!?؟]+\s*\n*/g; 
let textElementBatches: TextNode[][];

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
function replaceTextWithDiacritizedText(textElements: TextNode[], diacritizedTexts: string[], method: string): void {
  
  if (!Array.isArray(textElements) || !Array.isArray(diacritizedTexts)) {
    throw new Error('Both textElements and diacritizedTexts should be arrays.');
  }

  if (textElements.length !== diacritizedTexts.length) {
    throw new Error('textElements and diacritizedTexts should have the same length.');
  }

    for (let i = 0; i < textElements.length; i++) {
      const textElement = textElements[i];
      const diacritizedText = diacritizedTexts[i];

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
  console.log('Replaced text with diacritized text:', diacritizedTexts);
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
    textElementBatches = createDiacritizationElementBatches(newRecurseDOM(mainNode).textElements, 750);
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
