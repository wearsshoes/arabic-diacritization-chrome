import { countSysPromptTokens } from './anthropicCaller'
import { getAPIKey, DiacritizationDataManager } from './datamanager';
import { processDiacritizationRequest, processSelectedText } from './processDiacritizationRequest';

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

  if (message.action === "contentLoaded") {
    console.log('Content loaded:', message);
    contentLoaded = true;
    return true;
  }

  if (message.action === "getAPIKey") {
    getAPIKey().then((key) => sendResponse(key));
    return true;
  }

  // Get the system prompt length
  if (message.action === "getSystemPromptLength") {
    const prompt = message.prompt;
    countSysPromptTokens(prompt).then((tokens) => sendResponse(tokens));
    return true;
  }

  if (message.action === "getWebsiteData") {
    async function getWebsiteData() {
      try {
        const tab = await getActiveTab();
        const response = await messageContentScript(tab.id, { action: 'getWebsiteData' });
        console.log('Website data at background:', response);
        sendResponse(response);
      } catch (error) {
        console.error('Failed to get complete website data:', error);
      };
    };
    getWebsiteData();
    return true;
  }

  if (message.action === "getSavedInfo") {
    async function getSavedInfo() {
      try {
        const tab = await getActiveTab();
        await dataManager.getWebPageData(tab.url)
          // send the keys of the existing response?.diacritizations for the webpage
          .then((response) => {
            const savedDiacritizations = (Object.keys(response?.diacritizations || {}))
            console.log('Saved diacritizations:', savedDiacritizations);
            sendResponse(savedDiacritizations);
          })
          .catch((error) => console.error('Failed to get saved info:', error));
      } catch (error) {
        throw (error)
      }
    }
    getSavedInfo();
    return true;
  }

  // Handle the diacritization request
  if (message.action === "sendToDiacritize" && message.method) {
    console.log('Received diacritization request');

    processDiacritizationRequest(message.method)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error('Error processing diacritization:', error);
        sendResponse({ error: 'Failed to process diacritization.' });
      });

    return true;
  }

  // Clear the current webpage data
  if (message.action === "clearWebPageData") {
    async function clearWebsiteData() {
      try {
        const tab = await getActiveTab();
        console.log('Clearing data for:', tab.url);
        await dataManager.clearWebPageData(tab.url as string)
          .then(() => {
            sendResponse({ message: 'Database cleared.' });
          });
        chrome.tabs.reload(tab.id)
      } catch (error) {
        console.error('Failed to clear database:', error);
        sendResponse({ message: 'Failed to clear database.' });
      }
    }
    clearWebsiteData();
    return true;
  }

  // Clear the database
  if (message.action === "clearDatabase") {
    dataManager.clearAllData()
      .then(() => {
        sendResponse({ message: 'Database cleared.' });
      })
      .catch((error) => {
        console.error('Failed to clear database:', error);
        sendResponse({ message: 'Failed to clear database.' });
      });
    return true;

  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId === "processSelectedText") {
    console.log("Diacritizing selected text...");
    if (tab) {
      await processSelectedText(tab).then(() => {
        console.log('Website text updated');
      });
    }
  }
});


// ----------------- Functions ----------------- //

let contentScriptReady = false;
const messageQueue: any = [];
export const dataManager = DiacritizationDataManager.getInstance();

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
}