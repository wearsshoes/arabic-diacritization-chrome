export interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}
  
export interface DiacritizationRequestBatch {
  text: string;
  elements: TextElement[];
}
  
export interface ProcessorResponse {
  elements: TextElement[]; 
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
}

export interface DiacritizationElement {
  originalText: string;
  diacritizedText: string;
  xPaths: string[];
  lastDiacritized: Date;
  attributes: ElementAttributes;
}

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}
