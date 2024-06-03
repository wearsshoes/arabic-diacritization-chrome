import { TextNode } from "./webpageDataClass";

// TODO: structure AppMessage and AppResponse more strictly based on the message types
export interface AppMessage {
  action: string;
  // chrome.runtime.sendMessage:

  // clearWebpageData
  // getSystemPromptLength
  // cancelTask
  // openOptions

  // processText
  method?: string;
  wholePage?: boolean;

  // chrome.tabs.sendMessage:

  //  toggleWidget
  //  getWebsiteData
  //  getSelectedNodes
  //  webpageDone

  //  updateProgressBar
  strLength?: number;

  // errorMessage
  userMessage?: string;

  //  beginProcessing
  //    strLength?: number;

  //  updateWebsiteText
  tabUrl?: string;
  replacements?: TextNode[];
  ruby?: boolean;

}
interface SuccessResponse {
  status: 'success';

  // chrome.runtime.sendMessage(response)

  // processText
  // cancelTask
  // clearWebpageData
  // handleOpenOptions

  // getSystemPromptLength
  tokenLength?: number;

  // getSelectedNodes
  //   selectedNodes?: TextNode[];

  // chrome.tabs.sendMessage(response)

  // getWebsiteText
  selectedNodes?: TextNode[];
  contentSignature?: string;

  // getWebsiteData
  language?: string;
  characterCount?: number;

}

interface ErrorResponse {
  status: 'error';
  errorMessage?: string;
}

export type AppResponse = SuccessResponse | ErrorResponse;
