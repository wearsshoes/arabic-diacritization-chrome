// content.ts
import { TextElement, TranslationRequestBatch, ProcessorResponse } from "./types";

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


// Global Variables
const delimiter:string = '|'
let textElementBatches: TextElement[][];
let APIBatches: TranslationRequestBatch[];
// maybe this cache should go to the local storage, to have the option to reuse after page reload.
// TODO: save cache to local storage.
let cachedResponse: ProcessorResponse[];

// TODO: check page hash to see if we've already translated this page.

// TODO: if cached, try to align page with translations by hash and xpath.

// TODO: update page hash with new translations.

// TODO: hash the page url (what data structure to put this in?)

// Utility Functions

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function recurseDOM(node:Node=document.body, index:number=0, elementId:string=''): TextElement[] {
  const textElements: TextElement[] = [];
  // if we're on an element node, record elementId and pass to children.
  if (node.nodeType === Node.ELEMENT_NODE) {
    // TODO: replace with xxhash
    elementId = 'element-' + Math.random().toString(36).substring(2, 11); // Generate a unique ID for the element
    const element = node as Element;
    element.setAttribute('data-element-id', elementId); // Set the ID as a data attribute on the element
    if (node.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      for (const childNode of node.childNodes) {
        // TODO: it's not insane to split DOM nodes and modify the DOM at sentence breaks on '. '; 
        // this might make for better sentence and paragraph control.
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
      // TODO: add a hash here to avoid sending the same text to the API
    }
    textElements.push(textElement)
  };
  
  return textElements;
}

// NOT CALLED OR TESTED. STRAIGHT UP AI CODE. THIS BE SUSSY
function newRecurseDOM(node: Node = document.body, index: number = 0, elementId: string = ''): TextElement[] {
  const textElements: TextElement[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {
    elementId = 'element-' + generateUniqueId();
    const element = node as Element;
    element.setAttribute('data-element-id', elementId);

    if (node.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      for (const childNode of Array.from(node.childNodes)) {
        const innerText = newRecurseDOM(childNode, innerIndex, elementId);
        textElements.push(...innerText);
        innerIndex += innerText.length;
      }
    }
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    const sentences = splitTextIntoSentences(node.textContent);
    const fragment = document.createDocumentFragment();

    sentences.forEach((sentence, sentenceIndex) => {
      const cleanText = sentence.replace(delimiter, '');
      const textNodeId = `text-${generateUniqueId()}`;
      const textNode = document.createTextNode(cleanText);
      textNode.nodeValue = cleanText;
      textNode.textContent = cleanText;
      fragment.appendChild(textNode);

      const textElement: TextElement = {
        elementId: textNodeId,
        originalText: cleanText,
        index: index + sentenceIndex,
      };
      textElements.push(textElement);
    });

    node.parentNode?.replaceChild(fragment, node);
  }

  return textElements;
}

function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function splitTextIntoSentences(text: string): string[] {
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Mt', 'St'];
  const abbreviationRegex = new RegExp(`\\b(?:${abbreviations.join('|')})\\.\\.?`, 'g');
  const sentenceRegex = new RegExp(`(?:${abbreviationRegex.source})?[^.!?]+[.!?](?:\\s+|\\n|$)`, 'g');
  
  const matches = text.match(sentenceRegex) || [];
  return matches.map(sentence => sentence.trim());
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

  textElements.forEach((textElement) => {
    const text = textElement.originalText
    if (text!='') {
    // if (containsArabicCharacters(text)) {
    // we want to take these out, but doing so might cause us to lose context within sentences.
    // once we have better batch management with sentences paragraphs etc, we can then address this.
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
  try {
    for (let i = 0; i < textElements.length; i++) {
      const textElement = textElements[i];
      const translatedText = translatedTexts[i];
      const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);
      if (element) {
        element.childNodes[textElement.index].textContent = translatedText;
      } else {
        console.warn(`Warning: elementId ${textElement.elementId} did not map to any element.`);
      }
    }
    console.log('Replaced text with translated text:', translatedTexts);
  } catch (error) {
    console.error('Error replacing text with translated text:', error);
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

// Diacritize listener - waits for popup click, then sends batches to worker.
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
    })();
    return true;
  }
});

// starts the batch preparer
function main() {
  try {
    const mainNode = document.querySelector('main');
    console.log('Main node:', mainNode);
    textElementBatches = createTextElementBatches(recurseDOM(mainNode ?? document.body), 500);
    APIBatches = createAPIBatches(textElementBatches);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Run on script load 
// should maybe set to only run on lang="ar"?
if (document.readyState === "loading") {
  // Wait for loading to finish, otherwise number of elements tends not to converge
  document.addEventListener('DOMContentLoaded', main);
} else {
  // But often, `DOMContentLoaded` has already fired
  main();
}
