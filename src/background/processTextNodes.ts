import { AppResponse } from '../common/types';
import { TextNode, WebpageDiacritizationData } from "../common/webpageDataClass";
import { fullDiacritization } from "./arabicDiacritization";
import { messageContentScript } from './background';

export async function processSelectedText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics'): Promise<void> {
  if (!tab.id || !tab.url) throw new Error('Tab id or url not found')

  const request = await messageContentScript(tab.id, { action: "getSelectedNodes" });
  if (request.status === 'error') throw new Error(request.errorMessage);

  const { selectedNodes } = request;
  if (!selectedNodes) throw new Error("No selection");
  console.log('Selected nodes:', selectedNodes);

  const { pageData } = await buildData(tab.id, tab.url);
  const diacriticsSet = new Set(pageData.getDiacritization('fullDiacritics').map(node => node.elementId));

  const [oldNodes, newNodes] = selectedNodes.reduce<TextNode[][]>(
    (result, node) => {
      result[diacriticsSet.has(node.elementId) ? 0 : 1].push(node);
      return result;
    }, [[], []]);

  console.log('Processing old nodes:', oldNodes);
  await messageContentScript(tab.id, {
    action: 'updateWebsiteText',
    tabUrl: tab.url,
    replacements: oldNodes,
    method,
    ruby: method === 'arabizi'
  });

  if (newNodes.length > 0) {
    console.log('Processing new nodes:', newNodes);
    await fullDiacritization(tab.id, tab.url, newNodes, method === 'arabizi')
      .then((result) => { pageData.updateDiacritization(result, 'fullDiacritics') });
  }

  chrome.tabs.sendMessage(tab.id, { action: 'updateProgressBar', strLength: 100000 });
  await chrome.storage.local.set({ [tab.url]: pageData });
  console.log(Object(await chrome.storage.local.get(tab.url))[tab.url]);
}

export async function processWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {
  if (!tab.id || !tab.url) {
    const error = new Error('Tab id or url not found');
    return ({ status: 'error', errorMessage: error.message });
  }

  try {
    const { id: tabId, url: tabUrl } = tab;
    const { saveExists, pageData } = await buildData(tabId, tabUrl);
    let diacritics: TextNode[];

    if (saveExists) {
      const diacriticsSet = new Set(pageData.getDiacritization('fullDiacritics').map(node => node.elementId));
      const original = pageData.getDiacritization('original');

      const [oldNodes, newNodes] = original.reduce<TextNode[][]>(
        (result, node) => {
          result[diacriticsSet.has(node.elementId) ? 0 : 1].push(node);
          return result;
        }, [[], []]);

      console.log('Processing old nodes:', oldNodes);
      await messageContentScript(tabId, {
        action: 'updateWebsiteText',
        tabUrl: tabUrl,
        replacements: oldNodes,
        method,
        ruby: method === 'arabizi'
      });

      if (newNodes.length > 0) {
        console.log('Processing new nodes:', newNodes);
        const newDiacritics = await fullDiacritization(tabId, tabUrl, newNodes, method === 'arabizi');
        pageData.updateDiacritization(newDiacritics, 'fullDiacritics');
        diacritics = [...oldNodes, ...newDiacritics];
      } else {
        diacritics = oldNodes;
      }
    } else {
      const original = pageData.getDiacritization('original');
      diacritics = await fullDiacritization(tabId, tabUrl, original, method === 'arabizi');
      pageData.updateDiacritization(diacritics, 'fullDiacritics');
    }

    await chrome.storage.local.set({ [tabUrl]: pageData });

    messageContentScript(tabId, { action: 'allDone' });
    return { status: 'success', userMessage: 'Webpage diacritization complete.' };

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

async function buildData(tabId: number, tabUrl: string): Promise<{ saveExists: boolean, pageData: WebpageDiacritizationData }> {

  let pageData: WebpageDiacritizationData;
  let saveExists: boolean;

  const latest = await messageContentScript(tabId, { action: 'getWebsiteText' });
  if (latest.status === 'error') throw new Error(latest.errorMessage);

  const { contentSignature, selectedNodes } = latest;
  if (!contentSignature) throw new Error("Didn't get content signature");
  if (!selectedNodes) throw new Error("Didn't get website text");

  const saved: WebpageDiacritizationData = Object(await chrome.storage.local.get(tabUrl))[tabUrl];
  if (saved && saved.contentSignature === contentSignature) {
    console.log('Using saved webpage data.');
    Object.setPrototypeOf(saved, WebpageDiacritizationData.prototype);
    pageData = saved;
    pageData.updateLastVisited(new Date());
    saveExists = true;
  } else {
    console.log('Content has changed, creating new webpage data.');
    pageData = await WebpageDiacritizationData.build(tabUrl, contentSignature);
    pageData.createOriginal(selectedNodes);
    saveExists = false;
  }

  return { saveExists, pageData };
}