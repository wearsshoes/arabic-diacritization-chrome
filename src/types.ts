// Definition of types used in the application

import { calculateHash } from "./utils";

// should be replaced with DiacritizationElement.
export interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}

export interface DiacritizationElement {
  originalText: string;
  diacritizedText: string;
  index: number;
  lastDiacritized: Date;
  attributes: ElementAttributes;
}

// Roll this into WebPageDiacritizationData
export interface DiacritizationRequestBatch {
  text: string;
  elements: TextElement[];
}

export 

// Roll this into WebPageDiacritizationData
// Will be even easier to do if you move all the text serialize/deserialize into background.ts
export interface ProcessorResponse {
  elements: TextElement[]; 
  diacritizedTexts: string[];
  rawResult: string
} 

export interface TempProcessorResponse {
  elements: DiacritizationElement[]; 
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
      public elements: { [elementHash: string]: DiacritizationElement }
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

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}
