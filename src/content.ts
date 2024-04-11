// content.ts

// Interfaces
interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}

interface APIBatch {
  text: string;
  elements: TextElement[];
}

// Global Variables
const delimiter:string = '|'
let textElementBatches: TextElement[][];
let APIBatches: APIBatch[];

// Utility Functions
// Checks if node is visible
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  // still need some work, returns stuff hidden in menus and some weird stuf at the bottom of pages.
  return style.display !== 'none' && style.visibility !== 'hidden';
}

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function recurseDOM(node:Node=document.body, index:number=0, elementId:string=''): TextElement[] {
  const textElements: TextElement[] = [];
  
  // if we're on an element node, record elementId and pass to children.
  if (node.nodeType === Node.ELEMENT_NODE) {
    elementId = 'element-' + Math.random().toString(36).substring(2, 11); // Generate a unique ID for the element
    const element = node as Element;
    element.setAttribute('data-element-id', elementId); // Set the ID as a data attribute on the element
    if (node.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      for (const childNode of node.childNodes) {
        // TODO: it's not insane to split nodes at sentence breaks on '. '; this might make better sentences.
        const innerText = recurseDOM(childNode, innerIndex, elementId) // Maybe there's an easier, non-recursing way to do this?
        innerText.forEach(innerElement => {
          textElements.push(innerElement)
        });
        innerIndex++;
     }
    }
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) { // if we've reached a text node, push it with its parent's elementId.
    const cleanText = node.textContent.replace(delimiter,'') // so we don't have any of the delimiter character confusing us later. this is a bit jank...
    const textElement:TextElement = {
      elementId: elementId,
      originalText: node.textContent,
      index: index,
    }
    textElements.push(textElement)
  };
  
  return textElements;
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

  textElements.forEach((textElement) => {
    const text = textElement.originalText
    if (text!='') {
    // if (containsArabicCharacters(text)) {
      const textLength = text.length;

      if ((currentBatchLength + textLength) > maxChars) {
        if (currentBatch.length > 0) {
          console.log(currentBatchLength, 'maxChars');
          textElementBatches.push(currentBatch);
        }
        currentBatch = [textElement];
        currentBatchLength = textLength;
      } else {
        currentBatch.push(textElement);
        currentBatchLength += textLength;
        
        // handle sentence breaks as new batch        
        // often fails due to periods being not at the end of the node
        if (text.substring(text.length - 1 ) === "." && (currentBatchLength > (maxChars / 2))){
          console.log(currentBatchLength, 'end of sentence');
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
      console.log(textElement, ' is empty');
    }
  });
  console.log("batches created:", textElementBatches.length);
  textElementBatches.forEach(batch => {
    console.log(batch);
  });
  return textElementBatches;
}

// Prepare batches for API by extracting the text with delimiters.
function createAPIBatches(textElementBatches: TextElement[][]): { text: string; elements: TextElement[] }[] {
  console.log('beginning api batching')
  const translationBatches: { text: string; elements: TextElement[] }[] = [];

  textElementBatches.forEach((batch) => {
    const batchText = batch.map((textElement) => textElement.originalText).join(delimiter);
    console.log(batchText)
    translationBatches.push({ 
      text: batchText, 
      elements: batch 
    });
  });
  
  return translationBatches;
}

// DOM Manipulation
function replaceTextWithTranslatedText(textElements: TextElement[], translatedTexts: string[]): void {
  for (let i = 0; i < textElements.length; i++) {
    const textElement = textElements[i];
    const translatedText = translatedTexts[i];
    const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);

    if (element) {
      // console.log('Replacing ', element.childNodes[textElement.index].textContent, 'with ', translatedText, 'at ', element, textElement.index);
      element.childNodes[textElement.index].textContent = translatedText;
    } else {
      console.log('Error: elementId', textElement.elementId, 'did not map to any element.');
    }
  }
  console.log('inserted', translatedTexts)
}

// Forces LTR. Only gets called for Arabizi
function directionLTR() {
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
  const style = document.createElement('style')
  style.textContent = `body * {direction: ltr;}`;
  document.head.appendChild(style);
}    
interface processorResponse {
  elements: TextElement[]; 
  translatedTexts: string[];
  rawResult: string
}

let cachedResponse: processorResponse[];

// diacritize listener - waits for popup click, then sends batches to worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendToTranslate") {
    (async () => {
      // Send translation batches to background script
      chrome.runtime.sendMessage({action: "translate", method: request.method, cache:cachedResponse, data: APIBatches}, (response) => {
        // Handle the translated text here
        if (response.type === 'translationResult') {
          cachedResponse = response.data;
          console.log('Cached result:', cachedResponse);
          
          response.data.forEach((batch: { elements: TextElement[]; translatedTexts: string[] }) => {
            // console.log('Translated texts:', batch.translatedTexts);
            if (batch.translatedTexts.length !== batch.elements.length) {
              console.error('Mismatch in number of translated texts and text elements');
            }
            replaceTextWithTranslatedText(batch.elements, batch.translatedTexts);
          });
        } else if (response.type === 'error') {
          console.error("Translation error:", response.message);
        }
        if(request.method === 'arabizi'){
          directionLTR();
        }
      });
    })()
  }
});

// Run on script load 
if (document.readyState === "loading") {
  // Wait for loading to finish, otherwise number of elements tends not to converge
  document.addEventListener('DOMContentLoaded', main);
} else {
  // But often, `DOMContentLoaded` has already fired
  main();
}

function main() {
  const mainNode = document.querySelector('main')
  console.log(mainNode);
  textElementBatches = createTextElementBatches(recurseDOM(mainNode ?? document.body), 500)
  APIBatches = createAPIBatches(textElementBatches)
}