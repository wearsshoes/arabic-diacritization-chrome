// Definition of types used in the application

import { TextNode, PageMetadata } from "./dataClass";

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

interface SuccessResponse {
  status: 'success';
  error?: Error;
  selectedNodes?: TextNode[];
  pageMetadata?: PageMetadata;
  diacritizedStatus?: string;
  language?: string;
  characterCount?: number;
}

interface ErrorResponse {
  status: 'error';
  error: Error;
}

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}

export type AppResponse = SuccessResponse | ErrorResponse;
