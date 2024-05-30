import { AppResponse } from '../common/types';
import { TextNode, WebpageDiacritizationData } from "../common/webpageDataClass";
import { fullDiacritization } from "./arabicDiacritization";
import { messageContentScript } from './background';

export async function processText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics', entirePage: boolean = false): Promise<AppResponse> {
  if (!tab.id || !tab.url) {
    const error = new Error('Tab id or url not found');
    return ({ status: 'error', errorMessage: error.message });
  }

  try {
    const { id: tabId, url: tabUrl } = tab;
    let pageData

    let selectedNodes: TextNode[] = [];

    if (entirePage) {
      ({ pageData } = await buildData(tabId, tabUrl));
      selectedNodes = pageData.getDiacritization('original');
    } else {
      const request = await messageContentScript(tabId, { action: "getSelectedNodes" });
      if (request.status === 'error') throw new Error(request.errorMessage);
      selectedNodes = request.selectedNodes || [];
      if (!selectedNodes) throw new Error("No selection");
      ({ pageData } = await buildData(tabId, tabUrl, selectedNodes))
    }

    const diacritics = pageData.getDiacritization(method === 'original' ? 'original' : 'fullDiacritics')
    const diacriticsSet = new Set(diacritics.map(node => node.elementId));
    const selectedSet = new Set(selectedNodes.map(node => node.elementId));
    const oldNodes = diacritics.filter(node => selectedSet.has(node.elementId));
    const newNodes = selectedNodes.filter(node => !diacriticsSet.has(node.elementId));

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
    }

    await chrome.storage.local.set({ [tabUrl]: pageData });
    console.log(Object(await chrome.storage.local.get(tabUrl))[tabUrl]);

    if (entirePage) {
      messageContentScript(tabId, { action: 'allDone' });
      return { status: 'success', userMessage: 'Webpage diacritization complete.' };
    } else {
      chrome.tabs.sendMessage(tabId, { action: 'updateProgressBar', strLength: 100000 });
      return { status: 'success' };
    }

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

export async function processWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {
  return processText(tab, method, true);
}

async function buildData(tabId: number, tabUrl: string, selectedNodes?: TextNode[]): Promise<{ pageData: WebpageDiacritizationData }> {

  let pageData: WebpageDiacritizationData;

  const latest = await messageContentScript(tabId, { action: 'getWebsiteText' });

  if (latest.status === 'error') throw new Error(latest.errorMessage);

  const { contentSignature, selectedNodes: allNodes } = latest;

  if (!contentSignature) throw new Error("Didn't get content signature");
  if (!allNodes) throw new Error("Didn't get website text");

  const saved: WebpageDiacritizationData = Object(await chrome.storage.local.get(tabUrl))[tabUrl];

  if (!saved) {

    console.log('No save, creating new webpage data.');
    pageData = await WebpageDiacritizationData.build(tabUrl, contentSignature);

  } else {

    Object.setPrototypeOf(saved, WebpageDiacritizationData.prototype);
    pageData = saved;
    pageData.updateLastVisited(new Date());

    if (saved.contentSignature === contentSignature) {

      console.log('Using saved data.');

    } else {

      console.log('Content has changed, updating.');
      const latestTextMap = new Map(allNodes.map(node => [node.text, node]));
      const updatedOriginals: TextNode[] = [];
      const updatedFullDiacritics: TextNode[] = [];

      saved.getDiacritization('original').forEach(originalNode => {
        const latestNode = latestTextMap.get(originalNode.text);
        if (latestNode) {

          updatedOriginals.push({ ...originalNode, elementId: latestNode.elementId })
          const fullDiacriticNode = saved.getDiacritization('fullDiacritics').find(node => node.elementId === originalNode.elementId);

          if (fullDiacriticNode) {
            updatedFullDiacritics.push({ ...fullDiacriticNode, elementId: latestNode.elementId });
          }

        }

      });

      pageData.updateDiacritization(updatedOriginals, 'original', true);
      pageData.updateDiacritization(updatedFullDiacritics, 'fullDiacritics', true);
    }

  }

  pageData.updateDiacritization(selectedNodes ?? allNodes, 'original');
  return { pageData };
}