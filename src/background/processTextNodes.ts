import { AppResponse } from '../common/types';
import { TextNode, WebpageDiacritizationData } from "../common/webpageDataClass";
import { arabicToArabizi } from "./arabizi";
import { fullDiacritization } from "./arabicDiacritization";
import { messageContentScript, dataManager, controllerMap } from './background';

export async function processSelectedText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics'): Promise<void> {
  if (!tab.id || !tab.url) return;

  const controller = new AbortController();
  controllerMap.set(tab.id, controller);

  const request = await messageContentScript(tab.id, { action: "getSelectedNodes" });
  if (request.status === 'error') {
    console.error('Error getting selected nodes:', request.error);
    return;
  }

  console.log(request);
  const selectedNodes = new Set(request.selectedNodes);
  if ( !selectedNodes ) {
    console.log("No text selected, processing full webpage.");
    await processWebpage(tab, method);
    return;
  }

  console.log(`Processing ${method} for:`, selectedNodes.size, selectedNodes);
  await fullDiacritization(tab.id, tab.url, selectedNodes, controller.signal, method === 'arabizi')
}

export async function processWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {

  if (!tab.id || !tab.url) return ({ status: 'error', error: new Error('No tab ID or URL found') });
  const { id: tabId, url: tabUrl } = tab;

  const controller = new AbortController();
  controllerMap.set(tab.id, controller);

  const latest = await messageContentScript(tab.id, { action: 'getWebsiteText' });
  if (latest.status === 'error') return latest;
  const { pageMetadata } = latest;
  const selectedNodes = new Set<TextNode>(latest.selectedNodes);
  if (!pageMetadata) throw new Error('No page metadata found');
  if (!selectedNodes) throw new Error('No selected nodes found');
  const webpageDiacritizationData = await WebpageDiacritizationData.build(pageMetadata);
  await webpageDiacritizationData.createOriginal(selectedNodes);

  checkSaves();

  // Process the webpage
  console.log('Processing webpage:', tabUrl, 'with method:', method)
  switch (method) {
    case 'original': {
      const original = webpageDiacritizationData.getDiacritization('original');
      messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl, replacements: original, method });
      break;
    }
    case 'fullDiacritics':
      await fullDiacritization(tabId, tabUrl, webpageDiacritizationData.getDiacritization('original'), controller.signal)
        .then((result) => {
          webpageDiacritizationData.addDiacritization(result, method);
        });
      break;
    case 'arabizi': {
      if (!webpageDiacritizationData.diacritizations['fullDiacritics']) {
        console.log("Full diacritization doesn't exist, Diacritizing text first");
        await fullDiacritization(tabId, tabUrl, webpageDiacritizationData.getDiacritization('original'), controller.signal, true)
          .then((result) => {
            webpageDiacritizationData.addDiacritization(result, 'fullDiacritics');
          });
      }
      const arabiziNodes: Set<TextNode> = arabicToArabizi(webpageDiacritizationData.getDiacritization('fullDiacritics'));
      webpageDiacritizationData.addDiacritization(arabiziNodes, method);
      break;
    }

    default:
      throw new Error(method + ' is not implemented yet');
  }

  // Update the saved metadata
  let message = {} as AppResponse;
  dataManager.updateWebpageData(tab.url, webpageDiacritizationData)
    .then(() => {
      console.log('Saved webpage data updated:', webpageDiacritizationData)
      message = { status: 'success', userMessage: 'Webpage diacritization complete.' };
    })
    .catch((error) => {
      console.error('Failed to update saved webpage data:', error)
      message = { status: 'error', error };
    });

  messageContentScript(tabId, { action: 'allDone' });
  return message;

}

function checkSaves() {
  // // Load the saved data for the current webpage
  // const retrievedPageData = await dataManager.getWebpageData(tab.url);
  // console.log('Retrieved page data:', retrievedPageData);

  // let userMessage: string = '';

  // const requestMatchesSaved = function (): boolean {
  //   // If there's no saved data, continue
  //   if (!retrievedPageData) {
  //     userMessage = "There's no saved webpage data, continuing";
  //     return false;
  //   }

  //   // If saved data is available but has changed, ignore old data, continue
  //   const oldSig = retrievedPageData.metadata.contentSignature;
  //   const currentSig = pageMetadata.contentSignature;
  //   if (oldSig !== currentSig) {
  //     userMessage = `Content has changed, will regenerate diacritization and discard all old ones. Current hash: ${currentSig}, Saved hash: ${oldSig}`;
  //     return false;
  //     // TODO: only update the elements that have changed
  //     // logChanges(retrievedPageData.metadata, pageMetadata);
  //   }

  //   // If saved data doesn't contain the requested diacritization method, retrieve all other saved diacritizations, continue
  //   if (!Object.hasOwn(retrievedPageData.diacritizations, method)) {
  //     webpageDiacritizationData.diacritizations = retrievedPageData.diacritizations;
  //     userMessage = `Webpage is unchanged, generating ${method} from saved data: ${retrievedPageData.diacritizations}`;
  //     return false;
  //   }

  //   // If saved data contains the requested method, update the website text with the saved data, stop
  //   const diacritization = retrievedPageData.getDiacritization(method);
  //   messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl: tab.url, replacements: diacritization, method });
  //   userMessage = `Webpage is unchanged, using saved ${method} data`;
  //   return true;
  // };

  // // Stop here if we've already processed the request.
  // if (requestMatchesSaved()) {
  //   return ({ status: 'success', userMessage });
  // }
}