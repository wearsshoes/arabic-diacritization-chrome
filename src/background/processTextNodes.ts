import { AppResponse } from '../common/types';
import { PageMetadata, TextNode, WebpageDiacritizationData as WebpageDiacritizationData } from "../common/webpageDataClass";
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

  const { selectedNodes = [] } = request;
  if (selectedNodes.length === 0) {
    console.log("No text selected, processing full webpage.");
    await processWebpage(tab, method);
    return;
  }

  console.log("Doing ", method, "for selected nodes:", selectedNodes);
  const replacementText = await fullDiacritization(tab.id, tab.url, selectedNodes, controller.signal, method === 'arabizi');
  await messageContentScript(tab.id, { action: 'updateWebsiteText', tabUrl: tab.url, replacements: replacementText, method, ruby: (method === 'arabizi') });
}

export async function processWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {

  if (!tab.id || !tab.url) return ({ status: 'error', error: new Error('No tab ID or URL found') });
  const { id: tabId, url: tabUrl } = tab;

  const controller = new AbortController();
  controllerMap.set(tab.id, controller);

  const response = await messageContentScript(tab.id, { action: 'getWebsiteMetadata' });
  if (response.status === 'error') {
    return response;
  }
  const { pageMetadata }: { pageMetadata?: PageMetadata; } = response;
  if (!pageMetadata) {
    return ({ status: 'error', error: new Error('Did not recieve pageMetadata from content') });
  }
  const webpageDiacritizationData = await WebpageDiacritizationData.build(pageMetadata);
  console.log('Website metadata:', pageMetadata);

  // Load the saved data for the current webpage
  const retrievedPageData = await dataManager.getWebpageData(tab.url);
  console.log('Retrieved page data:', retrievedPageData);

  let userMessage: string = '';

  const requestMatchesSaved = function (): boolean {
    // If there's no saved data, continue
    if (!retrievedPageData) {
      userMessage = "There's no saved webpage data, continuing";
      return false;
    }

    // If saved data is available but has changed, ignore old data, continue
    const oldSig = retrievedPageData.metadata.contentSignature;
    const currentSig = pageMetadata.contentSignature;
    if (oldSig !== currentSig) {
      userMessage = `Content has changed, will regenerate diacritization and discard all old ones. Current hash: ${currentSig}, Saved hash: ${oldSig}`;
      return false;
      // TODO: only update the elements that have changed
      // logChanges(retrievedPageData.metadata, pageMetadata);
    }

    // If saved data doesn't contain the requested diacritization method, retrieve all other saved diacritizations, continue
    if (!Object.hasOwn(retrievedPageData.diacritizations, method)) {
      webpageDiacritizationData.diacritizations = retrievedPageData.diacritizations;
      userMessage = `Webpage is unchanged, generating ${method} from saved data: ${retrievedPageData.diacritizations}`;
      return false;
    }

    // If saved data contains the requested method, update the website text with the saved data, stop
    const diacritization = retrievedPageData.getDiacritization(method);
    messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl: tab.url, replacements: diacritization, method });
    userMessage = `Webpage is unchanged, using saved ${method} data`;
    return true;
  };

  // Stop here if we've already processed the request.
  if (requestMatchesSaved()) {
    return ({ status: 'success', userMessage });
  }

  // Get the website text
  if (!webpageDiacritizationData.diacritizations['original']) {
    const response = await messageContentScript(tab.id, { action: 'getWebsiteText' });
    if (response.status === 'error') {
      return response;
    }
    const { selectedNodes } = response;
    if (!selectedNodes) {
      return ({ status: 'error', error: new Error('Did not recieve TextNodes array from content script.') });
    }
    console.log('Retrieved original website text:', selectedNodes);
    await webpageDiacritizationData.createOriginal(selectedNodes);
  }

  // Process the webpage
  console.log('Processing webpage:', tabUrl, 'with method:', method)
  switch (method) {
    // If the method is 'fullDiacritics' and saved data exists for the current webpage, return the saved results
    case 'fullDiacritics':
      await fullDiacritization(tabId, tabUrl, webpageDiacritizationData.getDiacritization('original'), controller.signal)
        .then((fullDiacritics) => {
          webpageDiacritizationData.addDiacritization(fullDiacritics, method);
        });
      break;

    case 'arabizi': {
      if (!webpageDiacritizationData.diacritizations['fullDiacritics']) {
        console.log("Full diacritization doesn't exist, Diacritizing text first");
        await fullDiacritization(tabId, tabUrl, webpageDiacritizationData.getDiacritization('original'), controller.signal, true)
          .then((fullDiacritics) => {
            webpageDiacritizationData.addDiacritization(fullDiacritics, 'fullDiacritics');
          });
      }

      const arabiziNodes: TextNode[] = arabicToArabizi(webpageDiacritizationData.getDiacritization('fullDiacritics'));
      webpageDiacritizationData.addDiacritization(arabiziNodes, method);
      break;
    }

    case 'original': {
      break;
    }

    default:
      throw new Error(method + ' is not implemented yet');
  }

  // Update the saved metadata
  console.log('Updating saved web page data');
  dataManager.updateWebpageData(tab.url, webpageDiacritizationData)
    .then(() => console.log('Saved webpage data updated:', webpageDiacritizationData))
    .catch((error) => console.error('Failed to update saved webpage data:', error));

  // Update the website text
  const diacritization = webpageDiacritizationData.getDiacritization(method);
  const result = await messageContentScript(tab.id, { action: 'updateWebsiteText', tabUrl: tab.url, replacements: diacritization, method })
  if (result.status === 'success') {
    chrome.tabs.sendMessage(tab.id, { action: 'allDone', tabId: tab.id, method })
  }
  return result;
}