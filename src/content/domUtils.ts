import { TextNode, NodeHashDict } from "../common/dataClass";
const sentenceRegex = /[.!?؟]+\s*\n*/g;


// -------------- Functions -------------- //

function getTextNodesInRange(range: Range): TextNode[] {
  const textNodes: TextNode[] = [];

  // Create a TreeWalker to traverse the DOM tree within the range
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node) => {
        // Check if the node is within the range
        if (range.intersectsNode(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    }
  );

  // Traverse the DOM tree and collect text nodes
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push({
      elementId: currentNode.parentElement?.getAttribute('data-element-id') ?? '',
      index: getTextNodeIndex(currentNode as Text),
      text: currentNode.textContent ?? ''
    });
    currentNode = walker.nextNode();
  }

  return textNodes;
}

function getTextNodeIndex(textNode: Text): number {
  let index = 0;
  let currentNode = textNode.previousSibling;

  while (currentNode) {
    index++;
    currentNode = currentNode.previousSibling;
  }

  return index;
}

// function getTextElements(node: Node = document.body, index: number = 0, elementId: string = ''): { textElements: TextNode[] } {
//   const textElements: TextNode[] = [];

//   if (node.nodeType === Node.ELEMENT_NODE) {
//     const element = node as Element;
//     if (element.hasChildNodes() && isVisible(element)) {
//       let innerIndex = 0;
//       elementId = element.getAttribute('data-element-id') ?? '';
//       for (const childNode of Array.from(element.childNodes)) {
//         const innerText = getTextElements(childNode, innerIndex, elementId);
//         textElements.push(...innerText.textElements);
//         innerIndex += innerText.textElements.length;
//       }
//       index += innerIndex;
//     }

//   } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
//     const sentences = splitTextIntoSentences(node.textContent);
//     sentences.forEach((sentence, sentenceIndex) => {
//       const textElement: TextNode = {
//         elementId: elementId,
//         index: index + sentenceIndex,
//         text: sentence,
//       };

//       textElements.push(textElement);
//     });
//   };
//   return { textElements };
// }

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function getTextElementsAndIndexDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): { textElements: TextNode[], iterator: number } {
  const textElements: TextNode[] = [];

  if (node.nodeType === Node.ELEMENT_NODE) {

    const element = node as Element;
    if (element.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      elementId = 'element-' + iterator + '-' + element.tagName;
      element.setAttribute('data-element-id', elementId);
      for (const childNode of Array.from(element.childNodes)) {
        const innerText = getTextElementsAndIndexDOM(childNode, innerIndex, elementId, iterator++);
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

  return { textElements, iterator };
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
  if (method === 'arabizi') {
    directionLTR();
  }
}

function partiallyReplaceText(original: TextNode[], diacritization: string[], method: string): void {
  console.log('Replacing text using method:', method);

  if (original.length !== diacritization.length) {
    throw new Error('originals and replacementParts should have the same length.');
  }

  original.forEach((textNode, index) => {
    const element = document.querySelector(`[data-element-id="${textNode.elementId}"]`);
    if (element) {
      element.childNodes[textNode.index].textContent = diacritization[index];
    } else {
      console.warn(`Warning: elementId ${textNode.elementId} did not map to any element.`);
    }
  });

  if (method === 'arabizi') {
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

export { getTextNodesInRange, getTextElementsAndIndexDOM, replaceTextWithDiacritizedText, partiallyReplaceText };
