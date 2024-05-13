import { TextNode } from "../common/webpageDataClass";
import { sentenceRegex } from "../common/utils";

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
      elementId: currentNode.parentElement?.getAttribute('crxid') ?? '',
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
        // element.setAttribute('data-element-id', elementId);
      }

      for (const childNode of Array.from(element.childNodes)) {
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          const childElement = childNode as Element;
          const dataId = childElement.attributes.getNamedItem('crxid')?.value;
          if (dataId) {
            continue;
          }
        }
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
      const elementId = 'element-' + iterator;

      const textElement: TextNode = {
        elementId: elementId,
        index: index + sentenceIndex,
        text: sentence,
      };

      textElements.push(textElement);

      const spanElement = document.createElement('span');
      spanElement.textContent = sentence;
      spanElement.setAttribute('crxid', elementId);
      fragment.appendChild(spanElement);

      iterator++;
    });

    node.parentNode?.replaceChild(fragment, node);
  }

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
function replaceWebpageText(originals: TextNode[], replacements: TextNode[], method: string) {
  console.log(`Replacing text with ${method}`, originals, replacements);

  if (originals.length !== replacements.length) {
    throw new Error('originals and replacements should have the same length.');
  }

  originals.forEach((textNode, index) => {
    const { elementId } = textNode;
    const replacementEntry = replacements[index];
    const replacementText = typeof replacementEntry === 'string' ? replacementEntry : replacementEntry.text;

    const element = document.querySelector(`[crxid="${elementId}"]`);

    if (element) {
      element.textContent = replacementText;
    } else {
      console.warn(`Warning: elementId ${elementId} did not map to any element.`);
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

export { getTextNodesInRange, getTextElementsAndIndexDOM, replaceWebpageText };