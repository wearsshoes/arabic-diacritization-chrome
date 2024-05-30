// Definition of types used in the application

import { TextNode } from "./webpageDataClass";

export interface Prompt {
  name: string;
  text: string;
}

// TODO: structure AppMessage and AppResponse more strictly based on the message types
export interface AppMessage {
  action: string;
  tabUrl?: string;
  prompt?: string;
  method?: string;
  originals?: TextNode[];
  langScript?: string;
  replacements?: TextNode[];
  strLength?: number;
  ruby?: boolean;
}
interface SuccessResponse {
  status: 'success';
  userMessage?: string;
  error?: Error;
  selectedNodes?: TextNode[];
  contentSignature?: string;
  diacritizedStatus?: string;
  language?: string;
  characterCount?: number;
  key?: string;
  tokens?: number;
  savedInfo?: string[];
}

interface ErrorResponse {
  status: 'error';
  errorMessage?: string;
  // TODO: errors are not passed between background and content scripts.
  error?: Error;
}

export type AppResponse = SuccessResponse | ErrorResponse;
