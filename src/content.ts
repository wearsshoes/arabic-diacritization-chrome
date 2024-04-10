// content.ts



// Utility Functions
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

// Interfaces
interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
  // hasChildren: boolean;
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
      // hasChildren: false
    }
    // console.log(textElement)
    textElements.push(textElement)
  };

  return textElements;
}

// function getHTMLNodes() {
//   const htmlNodes = document.body.getElementsByTagName('*');
//   console.log(htmlNodes);
//   return(htmlNodes)
// }

// function extractTextElements(htmlNodes:HTMLCollection): TextElement[] {
//     const textElements: TextElement[] = [];
//   return textElements
// }

  //   if (node.textContent?.trim()) {
  //     const elementId = 'element-' + Math.random().toString(36).substring(2, 11); // Generate a unique ID for the parent element
  //     node.setAttribute('data-element-id', elementId); // Set the ID as a data attribute on the parent element

  //     let textNodeIndex = 0;
  //     // const elementTextElements: TextElement[] = []; // Temporary array to hold text elements for this parent

  //     let currentChildNodes;

  //     if (node.childElementCount > 0) {
  //       currentChildNodes = Array.from(node.childNodes)
  //       console.log(currentChildNodes)
  //     }
      
  //     textElements.push({
  //       elementId: elementId,
  //       originalText: node.textContent.trim(),
  //       index: 0,
  //       hasChildren: (node.childElementCount > 0),
  //       childNodes: currentChildNodes
  //     });
  //   } 

  //   }
  //       if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '') {
  //         const textElement: TextElement = {
  //           elementId: elementId, // Use the same elementId for all text nodes of this parent element
  //           originalText: node.textContent || '',
  //           index: textNodeIndex++ // Increment the index for each text node
  //         };
  //         elementTextElements.push(textElement);
  //       } else {
  //         textNodeIndex++ 
  //       }
  //   }
  // }

// function extractTextElements(): TextElement[] {
//   const textElements: TextElement[] = [];
//   const elements = document.body.getElementsByTagName('*');
//   console.log(elements);

//   for (const element of elements) {
//     if (element.textContent?.trim() && isVisible(element)) {
//       const elementId = 'element-' + Math.random().toString(36).substring(2, 11); // Generate a unique ID for the parent element

//       const childNodes = Array.from(element.childNodes);
//       let textNodeIndex = 0;
//       childNodes.forEach((node) => {
//         if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '') {
//           const textElement: TextElement = {
//             elementId: elementId, // Use the same elementId for all text nodes of this parent element
//             originalText: node.textContent || '',
//             index: textNodeIndex++ // Increment the index for each text node
//           };
//           textElements.push(textElement);
//         }
//       });
//     }
//   }

//   // Sort text elements by elementId and index to ensure correct order
//   textElements.sort((a, b) => {
//     if (a.elementId === b.elementId) {
//       return a.index - b.index;
//     }
//     return a.elementId.localeCompare(b.elementId);
//   });

//   return textElements;
// }


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
const translationBatches = createTranslationBatches(recurseDOM(), 500)
console.log(translationBatches);
translationBatches.forEach(element => {
  console.log(element.text)
});
// const htmlNodes = getHTMLNodes();
// const textElements = extractTextElements(htmlNodes);
// // console.log(textElements);

// const textBody = new(Array);
// textElements.forEach(element => {
//   if (element.hasChildren === false) {
//     textBody.push(element.originalText, element.elementId)
//   }
// });
// console.log(textBody);

// const translationBatches = createTranslationBatches(textElements, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "diacritize") {
    (async () => {
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
    })()
  }
});