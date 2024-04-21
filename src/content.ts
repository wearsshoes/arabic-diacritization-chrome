// content.ts
import { PageMetadata, TextNode, NodeHashDict, WebPageDiacritizationData } from "./dataClass";
import { ElementAttributes } from "./types";
import { calculateHash } from "./utils";

// -------------- Event Listeners -------------- //

// when queried by popup, returns the language of the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Get the website language (called by popup.ts)
  if (request.action === 'getWebsiteData') {
    console.log('Received request for website data...');
    const metadataReady = !!(pageMetadata && textElements);
    const language = document.documentElement.lang;
    const totalTextLength = textElements
        .map(node => node.text.length)
      .reduce((acc, curr) => acc + curr, 0);
    sendResponse({language, chars: totalTextLength, metadataReady});
  }
  
  // Get metadata about the website (called by background.ts)
  if (request.action === 'getWebsiteMetadata') {
    console.log('Received request for website metadata...');
    if (pageMetadata) {
      sendResponse(pageMetadata);
    } else {
      console.error('Metadata not found.');
      sendResponse({error: 'Metadata not found.'});
    }
    return true;
  };


  // When diacritization is requested, returns the APIBatches
  if (request.action === "getWebsiteText") {
    console.log('Received request for  website text...');
    sendResponse(textElements);
  }

  // Updates website when told to.
  if (request.action === "updateWebsiteText") {
    console.log('Received request to update website text...');
    const {original, diacritization, method} = request;
    console.log(original, diacritization, method)
    if (original && diacritization && method) {
      replaceTextWithDiacritizedText(original, diacritization, method);
      sendResponse({success: 'Text replaced.'});
    } else {
      sendResponse({error: 'Original or diacritization or method not found.'});
    }
    return true;
  }

});

// -------------- Functions -------------- //

// Global Variables
const sentenceRegex = /[.!?؟]+\s*\n*/g; 
let textElements: TextNode[];
let pageMetadata: PageMetadata;

// eventually this 
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

async function serializeStructureMetadata(): Promise<{ [key: string]: ElementAttributes }> {
  const content = document.body.querySelector('main')?.querySelectorAll('*') || document.body.querySelectorAll('*');

  console.log('Serializing page structure metadata...'); 
  const contentSummary = Array.from(content).map((element) => (element.tagName + element.id + element.className + (element.textContent || '')));
  console.log('Text content:', contentSummary);

  const keys = await calculateHash(contentSummary);
  
  const result: { [key: string]: ElementAttributes } = {};
  
  Array.from(content).forEach((element, index) => {
    const key = keys[index];
    result[key] = {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
    };
  });
  
  console.log('Structure metadata:', result);
  
  return result;
}

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function recurseDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): {textElements: TextNode[], iterator: number} {
  const textElements: TextNode[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {
    
    const element = node as Element;
    if (element.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      elementId = 'element-' + iterator + '-' + element.tagName;
      element.setAttribute('data-element-id', elementId);
      for (const childNode of Array.from(element.childNodes)) {
        const innerText = recurseDOM(childNode, innerIndex, elementId, iterator++);
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
      // maybe we flatmap the textElements?
      const textNode = document.createTextNode(sentence);
      fragment.appendChild(textNode);
      
      iterator++;
    });
    
    // again, this should be moved to another place in the program.
    node.parentNode?.replaceChild(fragment, node);
  };
  
  return {textElements, iterator};
}

function splitTextIntoSentences(text: string): string[] {
  return text.replace(sentenceRegex, '$&|').split('|').filter(sentence => sentence.trim() !== '');
}

// Checks if node is visible
function isVisible(element: Element): boolean {
  const checkElement = window.getComputedStyle(element);
  return checkElement.display !== 'none' && checkElement.visibility !== 'hidden'
}

// DOM Manipulation
function replaceTextWithDiacritizedText(originals: NodeHashDict, replacements: NodeHashDict, method: string): void {

  console.log('Replacing text using method:', method);
  if (originals.length !== replacements.length) {
    throw new Error('textElements and diacritizedTexts should have the same length.');
  }

  Object.keys(replacements).forEach((key) => {
    const newText = replacements[key]
    
    const element = document.querySelector(`[data-element-id="${newText.elementId}"]`);
    
    if (element) {
      if (element.childNodes[newText.index]) {
        element.childNodes[newText.index].textContent = newText.text;
      } else {
        console.warn(`Warning: childNode at index ${newText.index} does not exist in element with id ${newText.elementId}.`);
      }
    } else {
      console.warn(`Warning: elementId ${newText.elementId} did not map to any element.`);
    }
  
  })
  if(method === 'arabizi'){
    directionLTR();
  }
}

// Forces LTR. Only gets called for Arabizi
function directionLTR() {
  // document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
  const style = document.createElement('style')
  style.textContent = `body * {direction: ltr;}`;
  document.head.appendChild(style);
}    



// starts the batch preparer
async function main() {
  try {
    const structuralMetadata = await serializeStructureMetadata();
    console.log('Structural metadata:', structuralMetadata);
    await calculateContentSignature().then((contentSignature) => {;
      pageMetadata = {
        pageUrl: window.location.href,
        lastVisited: new Date,
        contentSignature,
        structuralMetadata
      };
    })
    console.log('Initializing...', pageMetadata);
    const mainNode = document.querySelector('main') || document.body;
    console.log('Main node:', mainNode); 
    textElements = recurseDOM(mainNode).textElements;
    console.log('Text elements:', textElements);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// -------------- Runtime -------------- //

// should maybe set to only run on lang="ar"?
if (document.readyState === "loading") {
  // Wait for loading to finish, otherwise number of elements tends not to converge
  document.addEventListener('DOMContentLoaded', main);
} else {
  // But often, `DOMContentLoaded` has already fired
  main();
}

