// content.ts

// Interfaces
interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}

// Utility Functions
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function recurseDOM(node:Node=document.body, index:number=0, elementId:string=''): TextElement[] {
  const textElements: TextElement[] = [];
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    elementId = 'element-' + Math.random().toString(36).substring(2, 11); // Generate a unique ID for the element
    const element = node as Element;
    element.setAttribute('data-element-id', elementId); // Set the ID as a data attribute on the element
    if (node.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      for (const childNode of node.childNodes) {
        const innerText = recurseDOM(childNode, innerIndex, elementId)
        innerText.forEach(innerElement => {
          textElements.push(innerElement)
        });
        innerIndex++;
     }
    }
  } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
    const textElement:TextElement = {
      elementId: elementId,
      originalText: node.textContent,
      index: index,
    }
    // console.log(textElement);
    textElements.push(textElement)
  };
  
  return textElements;
}

function containsArabicCharacters(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

// Create batches
function createTextElementBatches(textElements: TextElement[], maxChars: number): TextElement[][] {
  console.log('starting batching on', textElements.length, 'elements')
  const textElementBatches: TextElement[][] = [];
  let currentBatch: TextElement[] = [];
  let currentBatchLength = 0;

  textElements.forEach((textElement) => {
    const text = textElement.originalText
    if (containsArabicCharacters(text)) {
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
      // console.log(textElement, ' is empty');
    }
  });
  console.log("batches created:", textElementBatches.length);
  textElementBatches.forEach(batch => {
    console.log(batch);
  });
  return textElementBatches;
}

// Prepare batches for API
function createAPIBatches(textElementBatches: TextElement[][]): { text: string; elements: TextElement[] }[] {
  console.log('beginning api batching')
  const translationBatches: { text: string; elements: TextElement[] }[] = [];

  textElementBatches.forEach((batch) => {
    const batchText = batch.map((textElement) => textElement.originalText).join('|');
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

function directionLTR() {
  // Override the CSS styling with !important
  document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");

  // Style body
  const style = document.createElement('style')
  style.textContent = `body * {direction: ltr;}`;
  document.head.appendChild(style);
}    

// Main Execution
const textElementBatches = createTextElementBatches(recurseDOM(), 800)
const APIBatches = createAPIBatches(textElementBatches)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "diacritize") {
    (async () => {
      // Send translation batches to background script
      chrome.runtime.sendMessage({action: "translate", data: APIBatches}, (response) => {
        // Handle the translated text here
        if (response.type === 'translationResult') {
          response.data.forEach((batch: { elements: TextElement[]; translatedTexts: string[] }) => {
            // console.log('Translated texts:', batch.translatedTexts);
            if (batch.translatedTexts.length !== batch.elements.length) {
              console.error('Mismatch in number of translated texts and text elements');
            }
            replaceTextWithTranslatedText(batch.elements, batch.translatedTexts);
            // directionLTR();

          });
        } else if (response.type === 'error') {
          console.error("Translation error:", response.message);
        }
      });
    })()
  }
});