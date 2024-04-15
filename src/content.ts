// content.ts
import { TextElement, DiacritizationRequestBatch, ProcessorResponse } from "./types";

// -------------- Event Listeners -------------- //

// when queried by popup, returns the language of the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getWebsiteLanguage') {
    const language = document.documentElement.lang;
    sendResponse(language);
  }
  
  // when website text length is requested, returns apibatches details
  if (request.action === 'getWebsiteCharacterCount') {
    const totalTextLength = APIBatches.map(element => element.text.length).reduce((acc, curr) => acc + curr, 0);
    const numBatches = APIBatches.length;
    sendResponse({chars: totalTextLength, batches: numBatches});
  }

  // when diacritization is requested, returns the apibatches
  if (request.action === "getWebsiteText") {
    sendResponse({data: APIBatches});
  }

  // updates website when told to.
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
let textElementBatches: TextElement[][];
let APIBatches: DiacritizationRequestBatch[];
// maybe this cache should go to the local storage, to have the option to reuse after page reload.
// TODO: save cache to local storage.
let cachedResponse: ProcessorResponse[];


// TODO: if cached, try to align page with diacritizations by hash and xpath.


// Utility Functions

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function newRecurseDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): {textElements: TextElement[], iterator: number} {
  const textElements: TextElement[] = [];

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
      // NOTE: This calls several hundred new wasm instances!!! we should calculate it in a cheaper way.
      // const textNodeId = `text-${calculateHash(sentence)}`;
      const textNode = document.createTextNode(sentence);
      fragment.appendChild(textNode);
      // const parentIterator = Number(elementId.split('-')[1]);
      // console.log(elementId, index, sentenceIndex, iterator, sentence);
      // if (parentIterator + index + sentenceIndex != iterator) {
      //   console.error('Element index mismatch');
      // }
      
      // it would be a lot more stateful to do this in replaceTextWithDiacritizedText
      const cleanText = sentence.replace(delimiter, '');
      const textElement: TextElement = {
        elementId: elementId,
        originalText: cleanText,
        index: index + sentenceIndex,
      };
      textElements.push(textElement);
      iterator++;

      // instead of an iterator maybe we could use xPath? not sure how that works with text nodes.
    });
    
    node.parentNode?.replaceChild(fragment, node);
  };

  return {textElements, iterator};
}

function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Splits text into sentences.
// possible additions to function:
//   // const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Mt', 'St'];
//   // const sentenceEndings = ['.', '!', '?', '؟',];
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

// Check whether there are any Arabic characters. Not used
function containsArabicCharacters(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Create batches of elements according to sentence boundaries and API character limit.
function createTextElementBatches(textElements: TextElement[], maxChars: number): TextElement[][] {
  console.log('starting batching on', textElements.length, 'elements')
  const textElementBatches: TextElement[][] = [];
  let currentBatch: TextElement[] = [];
  let currentBatchLength = 0;
  let batchLengths: [number, string, TextElement[]][] = []

  textElements.forEach((textElement) => {
    const text = textElement.originalText
    if (text!='') {
    // if (containsArabicCharacters(text)) {
    // we want to take these out, but doing so might cause us to lose context within sentences.
    // once we have better batch management with sentences paragraphs etc, we can then address this.
      const textLength = text.length;

        if ((currentBatchLength + textLength) > maxChars) {
          if (currentBatch.length > 0) {
            batchLengths.push([currentBatchLength, 'maxChars', currentBatch]);
            textElementBatches.push(currentBatch);
          }
          currentBatch = [textElement];
          currentBatchLength = textLength;
        } else {
          currentBatch.push(textElement);
          currentBatchLength += textLength;
          
          // handle sentence breaks as new batch        
          if (text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))){
            batchLengths.push([currentBatchLength, 'end of sentence', currentBatch]);
            textElementBatches.push(currentBatch);
            currentBatch = [];
            currentBatchLength = 0
          }
        }
      } 
    });
    console.log("batches created:", textElementBatches.length);
    console.log(batchLengths);
  textElementBatches.forEach(batch => {
  });
  return textElementBatches;
}

// Prepare batches for API by extracting the text with delimiters.
function createAPIBatches(textElementBatches: TextElement[][]): DiacritizationRequestBatch[] {
  console.log('beginning api batching')
  const diacritizationBatches: { text: string; elements: TextElement[] }[] = [];

  textElementBatches.forEach((batch) => {
    const batchText = batch.map((textElement) => textElement.originalText).join(delimiter);
    console.log(batchText)
    diacritizationBatches.push({ 
      text: batchText, 
      elements: batch 
    });
  });
  
  return diacritizationBatches;
}

// DOM Manipulation
// function replaceTextWithDiacritizedText(textElements: TextElement[], diacritizedTexts: string[]): void {
//   try {
//     for (let i = 0; i < textElements.length; i++) {
//       const textElement = textElements[i];
//       const diacritizedText = diacritizedTexts[i];
//       const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);
//       if (element) {
//         element.childNodes[textElement.index].textContent = diacritizedText;
//       } else {
//         console.warn(`Warning: elementId ${textElement.elementId} did not map to any element.`);
//       }
//     }
//     console.log('Replaced text with diacritized text:', diacritizedTexts);
//   } catch (error) {
//     console.error('Error replacing text with diacritized text:', error);
//   }
// }

function replaceTextWithDiacritizedText(textElements: TextElement[], diacritizedTexts: string[], method: string): void {
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
    textElementBatches = createTextElementBatches(newRecurseDOM(mainNode).textElements, 750);
    APIBatches = createAPIBatches(textElementBatches);
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
