// content.ts
import { TextElement, DiacritizationRequestBatch, ProcessorResponse } from "./types";
import { calculateHash } from "./utils";

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
});

// Diacritize listener - waits for popup click, then sends batches to worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendToDiacritize") {
    (async () => {
      // Send diacritization batches to background script
      chrome.runtime.sendMessage({action: "diacritize", method: request.method, cache:cachedResponse, data: APIBatches}, (response) => {
        // Handle the diacritized text here
        if (response.type === 'diacritizationResult') {
          cachedResponse = response.data;
          console.log('Cached result:', cachedResponse);

          response.data.forEach((batch: { elements: TextElement[]; diacritizedTexts: string[] }) => {
            // console.log('Diacritized texts:', batch.diacritizedTexts);
            if (batch.diacritizedTexts.length !== batch.elements.length) {
              console.error('Mismatch in number of diacritized texts and text elements');
            }
            replaceTextWithDiacritizedText(batch.elements, batch.diacritizedTexts);
          });
        } else if (response.type === 'error') {
          console.error("Diacritization error:", response.message);
        }
        if(request.method === 'arabizi'){
          directionLTR();
        }
      });
    })();
    return true;
  }
});

// -------------- Functions -------------- //

// Global Variables
const delimiter:string = '|'
let textElementBatches: TextElement[][];
let APIBatches: DiacritizationRequestBatch[];
// maybe this cache should go to the local storage, to have the option to reuse after page reload.
// TODO: save cache to local storage.
let cachedResponse: ProcessorResponse[];

// TODO: check page hash to see if we've already diacritized this page.

// TODO: if cached, try to align page with diacritizations by hash and xpath.

// TODO: update page hash with new diacritizations.

// TODO: hash the page url (what data structure to put this in?)

// Utility Functions

// Builds element list according to interface. Recurses through DOM and put the in the right order. 

// function recurseDOM(node:Node=document.body, index:number=0, elementId:string='', iterator:number=0): {textElements:TextElement[], iterator:number} {
//   const textElements: TextElement[] = [];

//   if (node.nodeType === Node.ELEMENT_NODE) {
//     const element = node as Element;
//     elementId = 'element-' + iterator + '-' + calculateHash(iterator + element.tagName + element.id + element.className);
//     element.setAttribute('data-element-id', elementId); 
    
//   if (node.hasChildNodes() && isVisible(element)) {
//     let innerIndex = 0;
//     for (const childNode of node.childNodes) {
//         const result = recurseDOM(childNode, innerIndex, elementId, iterator++)
//         const innerText = result.textElements;
//         innerText.forEach(innerElement => {
//           textElements.push(innerElement)
//         });
//         iterator = result.iterator;
//         innerIndex++;
//       }
//     };
//   } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) { // if we've reached a text node, push it with its parent's elementId.
//     const cleanText = node.textContent.replace(delimiter,'')
//     const textElement:TextElement = {
//       elementId: elementId,
//       originalText: cleanText,
//       index: index,
//     }
//     textElements.push(textElement)
//   };
  
//   return {textElements, iterator};
// }

// NOT CALLED OR TESTED. STRAIGHT UP AI CODE. THIS BE SUSSY
function newRecurseDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): {textElements: TextElement[], iterator: number} {
  const textElements: TextElement[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {
    
    const element = node as Element;
    // elementId = 'element-' + iterator + '-' + element.tagName + '-' + element.id + '-' + element.className;
    elementId = 'element-' + iterator + '-' + element.tagName;
    element.setAttribute('data-element-id', elementId);

    if (element.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      for (const childNode of Array.from(element.childNodes)) {
        const innerText = newRecurseDOM(childNode, innerIndex, elementId, iterator++);
        textElements.push(...innerText.textElements);
        innerIndex += innerText.textElements.length;
        iterator = innerText.iterator;
      }
    }
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    const sentences = splitTextIntoSentences(node.textContent);
    const fragment = document.createDocumentFragment();

    sentences.forEach((sentence, sentenceIndex) => {
      const textNodeId = `text-${calculateHash(sentence)}`;
      const textNode = document.createTextNode(sentence);
      // if (sentenceIndex > 0) {
      //   console.log('will split', node.textContent, "and create", sentence)
      // }
      fragment.appendChild(textNode);
      console.log(elementId, index + sentenceIndex, sentence)
      
      const cleanText = sentence.replace(delimiter, '');
      const textElement: TextElement = {
        elementId: textNodeId,
        originalText: cleanText,
        index: index + sentenceIndex,
      };
      textElements.push(textElement);
      iterator++;
    });
    
    node.parentNode?.replaceChild(fragment, node);
  }

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
  const sentenceRegex = /[.!?]+\s*\n*/g; 
  return text.replace(sentenceRegex, '$&|').split('|').filter(sentence => sentence.trim() !== '');
}

// Checks if node is visible
function isVisible(element: Element): boolean {
  if (!element.getBoundingClientRect) {
    return false;
  }

  // const rect = element.getBoundingClientRect();
  // const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  // const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);

  // // Check if the element has dimensions and is within the viewport
  // const isInViewport = (
  //   rect.top >= 0 &&
  //   rect.left >= 0 &&
  //   rect.bottom <= viewHeight &&
  //   rect.right <= viewWidth
  // );

  // // Check if the element has a visible size
  // const hasSize = (
  //   rect.width > 0 &&
  //   rect.height > 0
  // );

  // // Check if the element's opacity is greater than 0
  // const opacity = parseFloat(window.getComputedStyle(element).getPropertyValue('opacity'));
  // const isOpaque = opacity > 0;

  // Check if the element or any of its ancestors have display: none or visibility: hidden
  const isDisplayed = (
    window.getComputedStyle(element).display !== 'none' &&
    window.getComputedStyle(element).visibility !== 'hidden'
  );

  // return isInViewport && hasSize && isOpaque && isDisplayed;
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
        // often fails due to periods being not at the end of the node
        const sentenceRegex = /[.!?]+\s*\n./g;
        if (text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))){
          batchLengths.push([currentBatchLength, 'end of sentence', currentBatch]);
          textElementBatches.push(currentBatch);
          currentBatch = [];
          currentBatchLength = 0
        }
        // handle paragraph breaks as new batch
        // } else if (text.substring(text.length - 1) === "\n") {
          //   console.log(currentBatchLength, 'end of paragraph');
          //   textElementBatches.push(currentBatch);
          //   currentBatch = [];
          //   currentBatchLength = 0 
          // }
        }
      } else {
        // console.log(textElement, ' is empty');
      }
    });
    console.log("batches created:", textElementBatches.length);
    console.log(batchLengths);
  textElementBatches.forEach(batch => {
    // console.log(batch);
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
function replaceTextWithDiacritizedText(textElements: TextElement[], diacritizedTexts: string[]): void {
  try {
    for (let i = 0; i < textElements.length; i++) {
      const textElement = textElements[i];
      const diacritizedText = diacritizedTexts[i];
      const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);
      if (element) {
        element.childNodes[textElement.index].textContent = diacritizedText;
      } else {
        console.warn(`Warning: elementId ${textElement.elementId} did not map to any element.`);
      }
    }
    console.log('Replaced text with diacritized text:', diacritizedTexts);
  } catch (error) {
    console.error('Error replacing text with diacritized text:', error);
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
    // textElementBatches = createTextElementBatches(recurseDOM(mainNode).textElements, 500);
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
