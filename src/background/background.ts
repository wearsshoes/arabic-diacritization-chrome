import { countSysPromptTokens } from './anthropicCaller'
import { getAPIKey, DiacritizationDataManager } from './datamanager';
import { processFullWebpage, processSelectedText } from './diacritization';

// ----------------- Event Listeners ----------------- //

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("ArabEasy successfully installed! Thank you for using this app.");
  } else if (details.reason == "update") {
    var thisVersion = chrome.runtime.getManifest().version;
    console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
  }

  chrome.contextMenus.create({
    id: "processSelectedText",
    title: "Fully Diacritize Selected Text",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error creating context menu: ${chrome.runtime.lastError.message}`);
    }
  });

});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  console.log('Received message:', message.action);
  try {

    switch (message.action) {
      case 'contentLoaded':
        console.log('Content loaded.');
        contentScriptReady = true;
        processQueuedMessages();
        return true;

      case 'getAPIKey':
        getAPIKey()
          .then((key) => sendResponse({ key }))
          .catch((error) => sendResponse({ error }));
        return true;

      case 'getSystemPromptLength':
        if (message.prompt) {
          countSysPromptTokens(message.prompt)
            .then((tokens) => sendResponse({ tokens }))
            .catch((error) => sendResponse({ error }));
        };
        return true;

      case 'getWebsiteData':
        (async () => {
          const tab = await getActiveTab();
          messageContentScript(tab.id, { action: 'getWebsiteData' })
            .then((websiteData) => sendResponse({ websiteData }))
            .catch((error) => sendResponse({ error }));
        })();
        return true;

      case 'getSavedInfo':
        getSavedInfo()
          .then((savedInfo) => sendResponse({ savedInfo }))
          .catch((error) => sendResponse({ error }));
        return true;

      // Handle the diacritization request
      case 'sendToDiacritize':
        if (message.method) {
          processFullWebpage(message.method)
            .then((result) => sendResponse({ result }));
        };
        return true;

      // Clear the current webpage data
      case 'clearWebPageData':
        clearWebsiteData()
          .then((result) => sendResponse({ result }))
        return true;

      // Clear the database
      case 'clearDatabase':
        dataManager.clearAllData()
          .then((result) => sendResponse({ result }))
        return true;

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error processing message:', error);
    sendResponse({ error });
  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId === "processSelectedText") {
    console.log("Diacritizing selected text...");
    processSelectedText(tab!)
      .then(() => {
        console.log('Website text updated');
      })
      .catch((error) => {
        handleError(error);
      });
  }
});

// ----------------- Functions ----------------- //

let contentScriptReady = false;
const messageQueue: any = [];
export const dataManager = DiacritizationDataManager.getInstance();

async function getSavedInfo() {
  const tab = await getActiveTab();
  await dataManager.getWebPageData(tab.url)
    .then((response) => {
      const savedDiacritizations = (Object.keys(response?.diacritizations || {}))
      return (savedDiacritizations);
    })
}

async function clearWebsiteData() {
  const tab = await getActiveTab();
  await dataManager.clearWebPageData(tab.url as string)
    .then(() => { return 'Website data cleared.' });
  chrome.tabs.reload(tab.id)
}

export async function getActiveTab(): Promise<{ id: number, url: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id === undefined) throw new Error('No active tab found');
  return { id: tab.id as number, url: tab.url as string };
}

export function messageContentScript(tabId: number, message: any): Promise<any> {
  if (contentScriptReady) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        resolve(response);
      });
    });
  } else {
    console.log('Content script not ready. Queueing message:', message);
    return new Promise((resolve) => {
      messageQueue.push({ tabId, message, resolve });
    });
  }
}

async function processQueuedMessages() {
  while (messageQueue.length > 0) {
    const { tabId, message, resolve } = messageQueue.shift();
    const response = await new Promise((innerResolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          innerResolve(response);
        })
      } catch (error) {
        innerResolve({ error });
      }
      resolve(response);
    });
  }
}

function handleError(error: Error) {
  console.error('An error occurred:', error.message);
  // Display a user-friendly error message
  chrome.notifications.create({
    type: 'basic',
    title: 'Error',
    message: 'An error occurred. Please try again later.',
    iconUrl: 'icon-128.png'
  });
}