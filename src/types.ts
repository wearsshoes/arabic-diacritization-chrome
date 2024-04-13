export interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}

export interface APIBatch {
  text: string;
  elements: TextElement[];
}

export interface processorResponse {
  elements: TextElement[]; 
  translatedTexts: string[];
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

export interface sysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}

class WebPageTranslationData {
  constructor(
      public pageId: string,
      public lastVisited: Date,
      public contentSignature: string,
      public structuralMetadata: string,
      public elements: { [elementHash: string]: TranslationElement }
  ) { }

  updateLastVisited(date: Date): void {
      this.lastVisited = date;
  }
}

interface TranslationElement {
  originalText: string;
  translatedText: string;
  xPaths: string[];
  lastTranslated: Date;
  attributes: ElementAttributes;
}

interface ElementAttributes {
  className?: string;
  id?: string;
  tagName: string;
}
