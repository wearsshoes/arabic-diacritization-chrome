import { AppResponse } from '../common/types';
import { PageMetadata, TextNode, WebPageDiacritizationData } from "../common/webpageDataClass";
import { arabicToArabizi } from "./arabizi";
import { fullDiacritization } from "./arabicDiacritization";
import { messageContentScript, dataManager, controllerMap } from './background';

export async function processSelectedText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics'): Promise<void> {
  if(!tab.id || !tab.url) return;

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
    await processFullWebpage(tab, method);
    return;
  }

  console.log("Doing ", method, "for selected nodes:", selectedNodes);
  let replacementText = await fullDiacritization(tab.id, tab.url, selectedNodes, controller.signal);
  console.log('Diacritization result:', replacementText);

  if (method === 'arabizi') {
    replacementText = arabicToArabizi(replacementText);
  }
  await messageContentScript(tab.id, { action: 'updateWebsiteText', url: tab.url, originals: selectedNodes, replacements: replacementText, method });
}

export async function processFullWebpage(tab: chrome.tabs.Tab, method: string): Promise<AppResponse> {

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
  const webPageDiacritizationData = await WebPageDiacritizationData.build(pageMetadata);
  console.log('Website metadata:', pageMetadata);

  // Load the saved data for the current webpage
  const retrievedPageData = await dataManager.getWebPageData(tab.url);
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
      webPageDiacritizationData.diacritizations = retrievedPageData.diacritizations;
      userMessage = `Webpage is unchanged, generating ${method} from saved data: ${retrievedPageData.diacritizations}`;
      return false;
    }

    // If saved data contains the requested method, update the website text with the saved data, stop
    const original = retrievedPageData.getDiacritization('original');
    const diacritization = retrievedPageData.getDiacritization(method);
    messageContentScript(tabId, { action: 'updateWebsiteText', url: tab.url, originals: original, replacements: diacritization, method });
    userMessage = `Webpage is unchanged, using saved ${method} data`;
    return true;
  };

  // Stop here if we've already processed the request.
  if (requestMatchesSaved()) {
    return ({ status: 'success', userMessage });
  }

  // Get the website text
  if (!webPageDiacritizationData.diacritizations['original']) {
    const response = await messageContentScript(tab.id, { action: 'getWebsiteText' });
    if (response.status === 'error') {
      return response;
    }
    const { selectedNodes } = response;
    if (!selectedNodes) {
      return ({ status: 'error', error: new Error('Did not recieve TextNodes array from content script.') });
    }
    console.log('Retrieved original website text:', selectedNodes);
    await webPageDiacritizationData.createOriginal(selectedNodes);
  }

  // Process the webpage
  switch (method) {
    // If the method is 'fullDiacritics' and saved data exists for the current webpage, return the saved results
    case 'fullDiacritics':
      await fullDiacritization(tabId, tabUrl, webPageDiacritizationData.getDiacritization('original'), controller.signal)
        .then((fullDiacritics) => {
          webPageDiacritizationData.addDiacritization(fullDiacritics, method);
        });
      break;

    case 'arabizi': {
      if (!webPageDiacritizationData.diacritizations['fullDiacritics']) {
        console.log("Full diacritization doesn't exist, Diacritizing text first");
        await fullDiacritization(tabId, tabUrl, webPageDiacritizationData.getDiacritization('original'), controller.signal)
          .then((fullDiacritics) => {
            webPageDiacritizationData.addDiacritization(fullDiacritics, 'fullDiacritics');
          });
      }

      const arabiziNodes: TextNode[] = arabicToArabizi(webPageDiacritizationData.getDiacritization('fullDiacritics'));
       webPageDiacritizationData.addDiacritization(arabiziNodes, method);
      break;
    }

    default:
      throw new Error(method + ' is not implemented yet');
  }

  // Update the saved metadata
  console.log('Updating saved web page data');
  dataManager.updateWebPageData(tab.url, webPageDiacritizationData)
    .then(() => console.log('Saved webpage data updated:', webPageDiacritizationData))
    .catch((error) => console.error('Failed to update saved webpage data:', error));

  // Update the website text
  const original = webPageDiacritizationData.getDiacritization('original');
  const diacritization = webPageDiacritizationData.getDiacritization(method);
  messageContentScript(tab.id, { action: 'updateWebsiteText', originals: original, replacements: diacritization, method })
    .then(() => console.log('Website text updated'));

  return ({ status: 'success' });
}
