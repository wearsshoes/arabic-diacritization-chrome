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

  wholePage?: boolean;

  strLength?: number;

  method?: string;
  replacements?: TextNode[];
  ruby?: boolean;
}
interface SuccessResponse {
  status: 'success';

  selectedNodes?: TextNode[];
  contentSignature?: string;

  language?: string;
  characterCount?: number;
  promptTokens?: number;
  savedInfo?: string[];
}

interface ErrorResponse {
  status: 'error';
  errorMessage?: string;
  // TODO: errors are not passed between background and content scripts.
  error?: Error;
}

export type AppResponse = SuccessResponse | ErrorResponse;
