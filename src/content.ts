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

// Prepare batches for API
function createTranslationBatches(textElements: TextElement[], maxCharactersPerRequest: number): { text: string; elements: TextElement[] }[] {
  let batchText = '';
  let batchElements: TextElement[] = [];
  const translationBatches: { text: string; elements: TextElement[] }[] = [];

  textElements.forEach((textElement, index) => {
    if (textElement.originalText) {
      if ((batchText.length + textElement.originalText.length) > maxCharactersPerRequest || index === textElements.length - 1) {
          if (batchText !== '') {
              // Add the current batch to the list of batches
              translationBatches.push({ text: batchText, elements: batchElements });
          }
          // Start a new batch with the current text element
          batchText = textElement.originalText;
          batchElements = [textElement];
      } else {
          // Append the current text element to the existing batch, with a separator if needed
          if (batchText !== '') {
              batchText += '\u200B';
          }
          batchText += textElement.originalText;
          batchElements.push(textElement);
      }
    }
  });

  // Add the last batch if it's not empty
  if (batchText !== '') {
      translationBatches.push({ text: batchText, elements: batchElements });
  }
  return translationBatches;
}

// DOM Manipulation
function replaceTextWithTranslatedText(textElements: TextElement[], translatedTexts: string[]): void {
  for (let i = 0; i < textElements.length; i++) {
    const textElement = textElements[i];
    const translatedText = translatedTexts[i];
    const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);

    if (element) {
      console.log('Replacing ', element.childNodes[textElement.index].textContent, 'with ', translatedText, 'at ', element, textElement.index);
      element.childNodes[textElement.index].textContent = translatedText;
    } else {
      console.log('Error: elementId', textElement.elementId, 'did not map to any element.');
    }
  }
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
const translationBatches = createTranslationBatches(recurseDOM(), 500)
// console.log(translationBatches);
translationBatches.forEach(element => {
  console.log(element.text)
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "diacritize") {
    (async () => {
      // Send translation batches to background script
      chrome.runtime.sendMessage({action: "translate", data: translationBatches}, (response) => {
        // Handle the translated text here
        if (response.type === 'translationResult') {
          response.data.forEach((batch: { elements: TextElement[]; translatedTexts: string[] }) => {
            // console.log('Translated texts:', batch.translatedTexts);
            if (batch.translatedTexts.length !== batch.elements.length) {
              console.error('Mismatch in number of translated texts and text elements');
            }
            replaceTextWithTranslatedText(batch.elements, batch.translatedTexts);
            directionLTR();

          });
        } else if (response.type === 'error') {
          console.error("Translation error:", response.message);
        }
      });
    })()
  }
});