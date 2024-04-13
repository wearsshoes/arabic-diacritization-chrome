export interface TextElement {
  elementId: string;
  originalText: string;
  index: number;
}
  
export interface TranslationRequestBatch {
  text: string;
  elements: TextElement[];
}
  
export interface ProcessorResponse {
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

export interface SysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}