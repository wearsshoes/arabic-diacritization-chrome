import { arabicToArabizi } from "../background/arabizi";
import { TextNode } from "../common/webpageDataClass";

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
    const text = currentNode.textContent ?? '';
    const elementId = currentNode.parentElement?.getAttribute('crxid') ?? '';
    if (text.trim() !== '' && elementId !== '') {
      textNodes.push({
        elementId,
        text
      });
    }
    currentNode = walker.nextNode();
  }
  return textNodes;
}

// Builds element list according to interface. Recurses through DOM and put the in the right order.
function getTextElementsAndIndexDOM(node: Node = document.body, elementId: string = '', iterator: number = 0): { textElements: TextNode[], iterator: number } {

  const textElements: TextNode[] = [];
  if (node.nodeType === Node.ELEMENT_NODE) {

    const element = node as Element;
    if (element.hasChildNodes() && isVisible(element)) {

      for (const childNode of Array.from(element.childNodes)) {
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          const childElement = childNode as Element;
          const dataId = childElement.attributes.getNamedItem('crxid')?.value;
          if (dataId) {
            elementId = 'element-' + iterator;
            childElement.setAttribute('crxid', elementId);
            const textElement: TextNode = {
              elementId: elementId,
              text: childElement.textContent ?? ''
            };
            textElements.push(textElement);
            iterator++;
            continue;
          }
        }
        const innerText = getTextElementsAndIndexDOM(childNode, elementId, iterator++);
        textElements.push(...innerText.textElements);
        iterator = innerText.iterator;
      }
    } else {
      iterator++;
    }

  } else if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent?.trim() !== '') {
    const sentences = splitTextIntoSentences(node.textContent);
    const fragment = document.createDocumentFragment();
    sentences.forEach((sentence) => {
      const elementId = 'element-' + iterator;

      const textElement: TextNode = {
        elementId,
        text: sentence
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
  const clauseRegex = /[.!?؟,،\])}»;:\-–—/]+\s*\n*/g;
  // const clauseRegex = /[.!?؟،,)}\];:-–—»/]+\s*\n*/g;
  return text.replace(clauseRegex, '$&|').split('|').filter(sentence => sentence.trim() !== '');
}

// Checks if node is visible
function isVisible(element: Element): boolean {
  const checkElement = window.getComputedStyle(element);
  return checkElement.display !== 'none' && checkElement.visibility !== 'hidden'
}

function replaceWebpageText(replacements: TextNode[], ruby: boolean = false) {
  if (ruby) {
    replacements = arabicToArabizi(replacements);
  }
  replacements.forEach((textNode) => {

    const { elementId, text } = textNode;
    if (elementId === '' || text === '') {return;}
    const element = document.querySelector(`[crxid="${elementId}"]`) as HTMLElement;
    if (element) {
      console.log(`Replacing ${element.innerHTML} with ${ruby || text.includes("<span")? 'ruby' : text} at ${elementId}`);
      element.innerHTML = text;
      element.animate(
        [
          {
            // from
            background: 'rgba(76, 175, 80, 0.8)',
          },
          {
            // to
            background: 'rgba(76, 175, 80, 0.0)'
          },
        ],
        500,
      );
    } else {
      console.warn(`Warning: ${elementId} doesn't exist, ${text}.`);
    }
  });
}



// Forces LTR. Only gets called for Arabizi
// function directionLTR() {
//   // document.documentElement.setAttribute("lang", "en");
//   document.documentElement.setAttribute("dir", "ltr");
//   const style = document.createElement('style')
//   style.textContent = `body * {direction: ltr;}`;
//   document.head.appendChild(style);
// }

export { getTextNodesInRange, getTextElementsAndIndexDOM, replaceWebpageText };