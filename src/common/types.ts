// Definition of types used in the application

import { TextNode, PageMetadata } from "./webpageDataClass";

export interface Prompt {
  name: string;
  text: string;
}
export interface AppMessage {
  action: string;
  prompt?: string;
  method?: string;
  originals?: TextNode[];
  replacements?: TextNode[];
  batches?: number;
}

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}

interface SuccessResponse {
  status: 'success';
  userMessage?: string;
  error?: Error;
  selectedNodes?: TextNode[];
  pageMetadata?: PageMetadata;
  diacritizedStatus?: string;
  language?: string;
  characterCount?: number;
  key?: string;
  tokens?: number;
  savedInfo?: string[];
}

interface ErrorResponse {
  status: 'error';
  error: Error;
}

export type AppResponse = SuccessResponse | ErrorResponse;
