import { TextNode } from "../common/webpageDataClass";

// -------------- Functions -------------- //

function labelDOM(element: Element = document.body, i = 0): number {
  if (isVisible(element) && !(element).hasAttribute('crxid')) {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const fragment = document.createDocumentFragment();
        splitTextIntoSentences(child.textContent).forEach((sentence) => {
          const spanElement = document.createElement('span');
          spanElement.textContent = sentence;
          spanElement.setAttribute('crxid', `position-${i++}`);
          fragment.appendChild(spanElement);
        });
        child.parentNode?.replaceChild(fragment, child);
      } else if (child.nodeType === Node.ELEMENT_NODE){
        i = labelDOM(child as Element, i);
      }
    }
  }
  return i;
}

function splitTextIntoSentences(text: string): string[] {
  const clauseRegex = /[.!?؟,،\])}»;:\-–—/]+\s*\n*/g;
  return text.replace(clauseRegex, '$&|').split("|").filter(sentence => sentence.trim() !== '');
}

function isVisible(element: Element): boolean {
  const inRender = element.closest('svg, figure');
  const css = window.getComputedStyle(element);
  return css.display !== 'none' && css.visibility !== 'hidden' && css.opacity !== '0' && !inRender;
}

function collectTextNodes(target: Range | Node = document.body): TextNode[] {

  const node = target instanceof Range ? target.commonAncestorContainer : target;
  const elements = (node as Element).querySelectorAll('[crxid]');
  const textNodes: TextNode[] = [];

  Array.from(elements).forEach((element) => {
    const elementId = element.getAttribute('crxid') ?? '';
    const text = element.textContent ?? '';
    const inRange = target instanceof Range ? target.intersectsNode(element) : true;

    if (elementId && text && inRange) {
      textNodes.push({ elementId, text });
    }
  });

  return textNodes;
}

function replaceWebpageText(replacements: TextNode[]) {
  replacements.forEach((textNode) => {
    const { elementId, text } = textNode;
    if (elementId === '' || text === '') return;

    const element = document.querySelector(`[crxid="${elementId}"]`) as HTMLElement;
    if (element) {
      element.innerHTML = text;
      element.animate([
        { background: 'rgba(76, 175, 80, 0.4)' },
        { background: 'rgba(76, 175, 80, 0.0)' },
      ], 500);
    } else {
      console.warn(`Warning: ${elementId} doesn't exist, ${text}.`);
    }
  });
}

export { labelDOM, collectTextNodes, replaceWebpageText };