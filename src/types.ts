// Definition of types used in the application
export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}

export interface Prompt {
  name: string;
  text: string;
}

export interface TransliterationDict {
  [key: string]: string[];
}

export interface SysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}