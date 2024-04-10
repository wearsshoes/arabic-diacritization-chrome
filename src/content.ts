// content.ts

// Interfaces
interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}

// Utility Functions
function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function extractTextElements(): TextElement[] {
  const textElements: TextElement[] = [];
  const elements = document.body.getElementsByTagName('*');

  for (const element of elements) {
    if (element.textContent?.trim() && isVisible(element)) {
      const elementId = 'element-' + Math.random().toString(36).substr(2, 9); // Generate a unique ID for the parent element
      element.setAttribute('data-element-id', elementId); // Set the ID as a data attribute on the parent element

      const childNodes = Array.from(element.childNodes);
      let textNodeIndex = 0;
      childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '') {
          const textElement: TextElement = {
            elementId: elementId, // Use the same elementId for all text nodes of this parent element
            originalText: node.textContent || '',
            index: textNodeIndex++ // Increment the index for each text node
          };
          textElements.push(textElement);
        } else {
          textNodeIndex++ 
        }
      });
    }
  }

  return textElements;
}


// Prepare batches for API
function createTranslationBatches(textElements: TextElement[], maxCharactersPerRequest: number): { text: string; elements: TextElement[] }[] {
  let batchText = '';
  let batchElements: TextElement[] = [];
  const translationBatches: { text: string; elements: TextElement[] }[] = [];

  textElements.forEach((textElement, index) => {
    if (/[a-z]/i.test(textElement.originalText)) {
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

// // Async worker for API call
// async function processTranslationBatches(translationBatches: { text: string; elements: TextElement[] }[]): Promise<void> {
//   const translationPromises = translationBatches.map(batch => translateTexts([batch.text]));
//   const translatedTextArrays = await Promise.all(translationPromises);

//   for (let i = 0; i < translationBatches.length; i++) {
//     const translatedTexts = translatedTextArrays[i][0].split('\u200B');
//     replaceTextWithTranslatedText(translationBatches[i].elements, translatedTexts);
//   }
// }

// // **DUMMY** API Call for Translation
// function translateTexts(texts: string[]): Promise<string[]> {
//   return new Promise((resolve) => {
//     // Simulate a delay for the API call
//     setTimeout(() => {
//       // For simplicity, let's just append " (translated)" to each text
//       const translatedTexts = texts.map(text => text + " (translated)");
//       resolve(translatedTexts);
//     }, 1000);
//   });
// }

// DOM Manipulation
function replaceTextWithTranslatedText(textElements: TextElement[], translatedTexts: string[]): void {
  for (let i = 0; i < textElements.length; i++) {
    const textElement = textElements[i];
    const translatedText = translatedTexts[i];
    const element = document.querySelector(`[data-element-id="${textElement.elementId}"]`);
  if (element) {

    console.log(
    'Replacing ',
    element.childNodes[textElement.index].textContent,
    'with ', 
    translatedText,
    'at ',
    element,
    textElement.index
    );

    element.childNodes[textElement.index].textContent = translatedText;
      // // Check if the node is a Text node
      // if (element.childNodes[textElement.index] instanceof Text) {
      //   // Update the text content
      //   element.childNodes[textElement.index].textContent = translatedText;
      // } else {
      //   console.error('Node is not a Text node:', element.childNodes[textElement.index]);
      // }
    } else {
      console.log('Error: elementId', textElement.elementId, 'did not map to any element.');
 
    }
  }
}


// Main Execution
(async () => {
  const textElements = extractTextElements();
  const translationBatches = createTranslationBatches(textElements, 1000);
  console.log(translationBatches.length)

  // Send translation batches to background script
  chrome.runtime.sendMessage({action: "translate", data: translationBatches}, (response) => {
    // Handle the translated text here
    console.log("Translation completed", response.data);
    if (response.type === 'translationResult') {
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
  });
})();