import { TextNode } from "../common/webpageDataClass";

// -------------- Functions -------------- //

function labelDOM(node: Node = document.body, i = 0): number {
  if (node.nodeType === Node.ELEMENT_NODE && isVisible(node as Element)) {
    node.childNodes.forEach(childNode => {
      if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()) {
        const sentences = splitTextIntoSentences(childNode.textContent);
        const fragment = document.createDocumentFragment();
        sentences.forEach((sentence) => {
          const spanElement = document.createElement('span');
          spanElement.textContent = sentence;
          spanElement.setAttribute('crxid', `${i++}`);
          fragment.appendChild(spanElement);
        });
        childNode.parentNode?.replaceChild(fragment, childNode);
      } else {
        i = labelDOM(childNode, i);
      }
    });
  }
  return i;
}

function getTextNodesInRange(range: Range): TextNode[] {
  const textNodes: TextNode[] = [];

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node) => {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const text = currentNode.textContent ?? '';
    const elementId = currentNode.parentElement?.getAttribute('crxid') ?? '';
    if (text.trim() !== '' && elementId !== '') {
      textNodes.push({ elementId, text });
    }
    currentNode = walker.nextNode();
  }
  return textNodes;
}

function collectElements(node: Node = document.body): TextNode[] {
  return Array.from((node as Element).querySelectorAll('[crxid]'))
    .map(element => ({
      elementId: element.getAttribute('crxid') ?? '',
      text: element.textContent ?? ''
    }))
    .filter(textElement => textElement.elementId && textElement.text);
}

function splitTextIntoSentences(text: string): string[] {
  const clauseRegex = /[.!?؟,،\])}»;:\-–—/]+\s*\n*/g;
  return text.replace(clauseRegex, '$&|').split("|").filter(sentence => sentence.trim() !== '');
}

function isVisible(element: Element): boolean {
  const css = window.getComputedStyle(element);
  return css.display !== 'none' && css.visibility !== 'hidden'
}

function replaceWebpageText(replacements: TextNode[]) {
  replacements.forEach((textNode) => {

    const { elementId, text } = textNode;
    if (elementId === '' || text === '') return;

    const element = document.querySelector(`[crxid="${elementId}"]`) as HTMLElement;
    if (element) {
      console.log(`Replacing ${element.innerHTML} with ${text.includes("<span") ? 'ruby' : text} at ${elementId}`);
      element.innerHTML = text;
      element.animate([
        { background: 'rgba(76, 175, 80, 0.8)' },
        { background: 'rgba(76, 175, 80, 0.0)' },
      ], 500);
    } else {
      console.warn(`Warning: ${elementId} doesn't exist, ${text}.`);
    }
  });
}

export { getTextNodesInRange, labelDOM, collectElements, replaceWebpageText };