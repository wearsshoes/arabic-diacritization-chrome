// Definition of types used in the application

import { calculateHash } from "./utils";

// should be replaced with DiacritizationElement.
export interface TextNode {
  elementId: string;
  index: number
  text: string;
}

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}


// Roll this into WebPageDiacritizationData
export interface DiacritizationRequestBatch {
  text: string;
  elements: TextNode[];
}

// Roll this into WebPageDiacritizationData
// Will be even easier to do if you move all the text serialize/deserialize into background.ts
export interface ProcessorResponse {
  elements: TextNode[]; 
  diacritizedTexts: string[];
  rawResult: string 
}
 
export interface Prompt {
  name: string;
  text: string;
}

export interface Models {
  [key: string]: Model;
}

export interface Model {
  currentVersion: string;
  level: number;
}

export interface TransliterationDict {
  [key: string]: string[];
}

export interface SysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}

// it's like, not inconvceivable that you just transmit the entire webpage into background.ts
export class WebPageDiacritizationData {
  constructor(
      public pageId: string,
      public lastVisited: Date,
      public contentSignature: string,
      public structuralMetadata: string,
      public elements: { [nodeHash: string]: TextNode }
  ) { }

  updateLastVisited(date: Date): void {
      this.lastVisited = date;
  }

  async calculateContentSignature(elements: NodeListOf<Element>): Promise<string> {
    // Calculate a content signature by hashing
    const textContent = Array.from(elements).map((element) => element.textContent).join("");
    const signature = await calculateHash(textContent);
    return signature;
    
  }

  serializeStructureMetadata(elements: NodeListOf<Element>): string {
      // Serialize page structure metadata
      // This can be done by converting the elements to a JSON string without the text content
      const serialized: ElementAttributes[] = Array.from(elements).map((element) => {
          return {
              tagName: element.tagName,
              id: element.id,
              className: element.className,
          };
      });
      return JSON.stringify(serialized);
  }
}