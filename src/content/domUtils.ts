import { TextNode, NodeHashDict } from "../common/dataClass";

// -------------- Functions -------------- //
const sentenceRegex = /[.!?؟]+\s*\n*/g;

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

// Builds element list according to interface. Recurses through DOM and put the in the right order. 
function getTextElementsAndIndexDOM(node: Node = document.body, index: number = 0, elementId: string = '', iterator: number = 0): { textElements: TextNode[], iterator: number } {
  
  const textElements: TextNode[] = [];
  if (node.nodeType === Node.ELEMENT_NODE) {

    const element = node as Element;
    if (element.hasChildNodes() && isVisible(element)) {
      let innerIndex = 0;
      
      if (Array.from(element.childNodes).some(childNode => childNode.nodeType === Node.TEXT_NODE)) {
        elementId = 'element-' + iterator + '-' + element.tagName;
        element.setAttribute('data-element-id', elementId);
      }

      for (const childNode of Array.from(element.childNodes)) {
        const innerText = getTextElementsAndIndexDOM(childNode, innerIndex++, elementId, iterator++);
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
      const textNode = document.createTextNode(sentence);
      fragment.appendChild(textNode);

      iterator++;
    });

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
function replaceWebpageText(originals: NodeHashDict | TextNode[], replacements: NodeHashDict | string[], method: string): Promise<void> {
  console.log(`Replacing text with ${method}`, originals, replacements);

  const originalEntries = Array.isArray(originals) ? originals : Object.values(originals);
  const replacementEntries = Array.isArray(replacements) ? replacements : Object.values(replacements);

  if (originalEntries.length !== replacementEntries.length) {
      throw new Error('originals and replacements should have the same length.');
  }

  originalEntries.forEach((textNode, index) => {
      const { elementId, index: nodeIndex } = textNode;
      const replacementEntry = replacementEntries[index];
      const replacementText = typeof replacementEntry === 'string' ? replacementEntry : replacementEntry.text;

      const element = document.querySelector(`[data-element-id="${elementId}"]`);

      if (element) {
          if (element.childNodes[nodeIndex]) {
              element.childNodes[nodeIndex].textContent = replacementText;
          } else {
              console.warn(`Warning: childNode at index ${nodeIndex} does not exist in element with id ${elementId}.`);
          }
      } else {
          console.warn(`Warning: elementId ${elementId} did not map to any element.`);
      }
  });

  if (method === 'arabizi') {
      directionLTR();
  }
  return Promise.resolve();
}

// Forces LTR. Only gets called for Arabizi
function directionLTR() {
  // document.documentElement.setAttribute("lang", "en");
  document.documentElement.setAttribute("dir", "ltr");
  const style = document.createElement('style')
  style.textContent = `body * {direction: ltr;}`;
  document.head.appendChild(style);
}

export { getTextNodesInRange, getTextElementsAndIndexDOM, replaceWebpageText };