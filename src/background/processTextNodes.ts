import { AppResponse } from '../common/types';
import { TextNode, WebpageDiacritizationData } from "../common/webpageDataClass";
import { fullDiacritization } from "./arabicDiacritization";
import { messageContentScript } from './background';

export async function processSelectedText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics'): Promise<void> {
  if (!tab.id || !tab.url) {
    Promise.reject('Tab id or url not found'); return;
  }

  const request = await messageContentScript(tab.id, { action: "getSelectedNodes" });
  if (request.status === 'error') {
    Promise.reject(request.errorMessage);
    return;
  }

  const { selectedNodes } = request;
  if (!selectedNodes) {
    await processWebpage(tab, method);
    return;
  }

  console.log(`Processing ${method} for:`, selectedNodes.length, selectedNodes);
  await fullDiacritization(tab.id, tab.url, selectedNodes, method === 'arabizi');
  chrome.tabs.sendMessage(tab.id, { action: 'updateProgressBar', strLength: 100000 }); //lmao
}

export async function processWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {
  try {
    if (!tab.id || !tab.url) {
      const error = new Error('Tab id or url not found');
      return ({ status: 'error', errorMessage: error.message });
    }
    const { id: tabId, url: tabUrl } = tab;

    const latest = await messageContentScript(tab.id, { action: 'getWebsiteText' });
    if (latest.status === 'error') return latest;

    const { contentSignature, selectedNodes } = latest;
    if (!contentSignature) throw new Error('No page metadata found');
    if (!selectedNodes) throw new Error('No selected nodes found');

    const { diacritics, webpageDiacritizationData }: { diacritics: TextNode[]; webpageDiacritizationData: WebpageDiacritizationData; } = await checkSave(tabUrl, contentSignature, method, selectedNodes, tabId);

    messageContentScript(tabId, {
      action: 'updateWebsiteText',
      tabUrl: tab.url,
      replacements: diacritics,
      method,
      ruby: method === 'arabizi'
    });

    // Update the saved metadata
    let message = {} as AppResponse;
    chrome.storage.local.set({ [tabUrl]: webpageDiacritizationData })
      .then(() => {
        chrome.storage.local.get(tabUrl, (data) => console.log('Successfully saved webpage data:', data));
        message = { status: 'success', userMessage: 'Webpage diacritization complete.' };
      })
      .catch((error: Error) => {
        console.error('Failed to update saved webpage data:', error)
        message = { status: 'error', errorMessage: (error).message };
      });

    messageContentScript(tabId, { action: 'allDone' });
    return message;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Aborted processing webpage:', error.message);
        return ({ status: 'error', errorMessage: 'Processing aborted' });
      }
      console.error(`Failed to process webpage: ${error.message}`, error.stack);
      return ({ status: 'error', errorMessage: error.message });
    }
  }
  return ({ status: 'error', errorMessage: 'Unknown error occurred' });
}

async function checkSave(tabUrl: string, contentSignature: string, method: string, selectedNodes: TextNode[], tabId: number) {
  let webpageDiacritizationData: WebpageDiacritizationData;
  let diacritics: TextNode[] = [];

  const saved: WebpageDiacritizationData = Object(await chrome.storage.local.get(tabUrl))[tabUrl];
  if (saved && saved.contentSignature === contentSignature) {
    console.log('Using saved webpage data:');
    Object.setPrototypeOf(saved, WebpageDiacritizationData.prototype);
    webpageDiacritizationData = saved;
    webpageDiacritizationData.updateLastVisited(new Date());
    diacritics = webpageDiacritizationData.getDiacritization(method === 'original' ? 'original' : 'fullDiacritics');
  } else {
    console.log('Content has changed, creating new webpage data:');
    webpageDiacritizationData = await WebpageDiacritizationData.build(tabUrl, contentSignature);
    webpageDiacritizationData.createOriginal(selectedNodes);
    diacritics = await fullDiacritization(tabId, tabUrl, selectedNodes, method === 'arabizi');
    webpageDiacritizationData.updateDiacritization(diacritics, 'fullDiacritics');
  }
  return { diacritics, webpageDiacritizationData };
}

