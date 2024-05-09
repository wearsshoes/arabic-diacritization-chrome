import { countSysPromptTokens } from './anthropicCaller'
import { DiacritizationDataManager } from './datamanager';
import { getAPIKey } from "../common/utils";
import { AppMessage, AppResponse } from '../common/types';
import { processFullWebpage, processSelectedText } from './processTextNodes';

// ----------------- Event Listeners ----------------- //

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("ArabEasy successfully installed! Thank you for using this app.");
  } else if (details.reason == "update") {
    const thisVersion = chrome.runtime.getManifest().version;
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

  chrome.contextMenus.create({
    id: "romanizeSelectedText",
    title: "Romanize Selected Text",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error creating context menu: ${chrome.runtime.lastError.message}`);
    }
  });

});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message: AppMessage, sender, sendResponse: (response: AppResponse) => void) => {

  console.log('Received message:', message.action);
  try {

    switch (message.action) {
      case 'widgetHandshake':
        break;

      case 'contentLoaded':
        contentScriptReady = true;
        processQueuedMessages();
        break;

      case 'getAPIKey':
        getAPIKey()
          .then((key) => sendResponse({ status: 'success', key }))
        return true;

      case 'getSystemPromptLength':
        if (message.prompt) {
          countSysPromptTokens(message.prompt)
            .then((tokens) => sendResponse({ status: 'success', tokens }))
        }
        return true;

      case 'openOptionsPage':
        chrome.runtime.openOptionsPage();
        break;

      case 'getWebsiteData':
        (async () => {
          const tab = sender.tab ? sender.tab : await getActiveTab();
          if (!tab.id) throw new Error('No active tab found');
          messageContentScript(tab.id, { action: 'getWebsiteData' })
            .then((websiteData) => sendResponse(websiteData))
        })();
        return true;

      case 'getSavedDiacritizations':
        (async () => {
          const tab = sender.tab ? sender.tab : await getActiveTab();
          getSavedInfo(tab)
          .then((savedInfo) => {
              sendResponse({ status: 'success', savedInfo })
          })
          });
        return true;

      // Handle the diacritization request
      case 'sendToDiacritize':
        if (sender.tab) {
          if (message.method) {
            processFullWebpage(sender.tab, message.method)
        }
        }
        sendResponse({ status: 'success' });
        break;

      // Clear the current webpage data
      case 'clearWebPageData':
        getActiveTab()
          .then((tab) => {
            clearWebsiteData(tab)
              .then(() => sendResponse({ status: 'success' }))
          })
        return true;

      // Clear the database
      case 'clearDatabase':
        dataManager.clearAllData()
          .then(() => sendResponse({ status: 'success' }))
        return true;

      case 'cancelAll':
        async () => {
          const tab = sender.tab ? sender.tab : await getActiveTab();
          if (!tab.id) throw new Error("Unclear which tab process to cancel");
          cancelTask(tab.id);
          sendResponse({ status: 'success' });
        }
        return true;

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error processing message:', error);
    sendResponse({ status: 'error', error: error as Error });
  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (!tab) {
    console.error(new Error(`${info.menuItemId}: ${tab} doesn't exist.`));
    return;
  }
  if (info.menuItemId === "processSelectedText") {
    console.log("Diacritizing selected text...");
    processSelectedText(tab, 'fullDiacritics')
      .then(() => {
        console.log('Website text updated with diacritics.');
      })
      .catch((error) => {
        handleError(error);
      });
  } else if (info.menuItemId === "romanizeSelectedText") {
    console.log("Romanizing selected text...");
    processSelectedText(tab, 'arabizi')
      .then(() => {
        console.log('Website text updated to romanization.');
      })
      .catch((error) => {
        handleError(error);
      });
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log(`Command entered: ${command}`);
  switch (command) {
    case 'toggle-widget':
      chrome.tabs.query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab.id === undefined) throw new Error('No active tab found');
          chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
      });
      break;
  }
});

// ----------------- Functions ----------------- //

let contentScriptReady = false;

const messageQueue: { tabId: number, message: AppMessage, resolve: (value: AppResponse | PromiseLike<AppResponse>) => void }[] = [];
export const dataManager = DiacritizationDataManager.getInstance();

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]);
}

async function getSavedInfo(tab: chrome.tabs.Tab): Promise<string[]> {
  if (!tab.url) throw new Error('No URL to get saved info for.');
  const response = await dataManager.getWebPageData(tab.url);
      const savedDiacritizations = (Object.keys(response?.diacritizations || {})).filter((key) => (key !== 'original'));
  return savedDiacritizations;
}

async function clearWebsiteData(tab: chrome.tabs.Tab): Promise<boolean> {
  if (!tab.url) throw new Error('No URL to clear saved info for..');
  await dataManager.clearWebPageData(tab.url);
  if (tab.id) chrome.tabs.reload(tab.id);
  return true;
}

export function messageContentScript(tabId: number, message: AppMessage): Promise<AppResponse> {
  if (contentScriptReady) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error sending message:', message);
          reject(chrome.runtime.lastError);
        } else {
          resolve(response !== undefined ? response : null);
        }
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
    const queuedMessage = messageQueue.shift();
    if (queuedMessage) {
      const { tabId, message, resolve } = queuedMessage;
      try {
        const response = await messageContentScript(tabId, message);
        resolve(response);
      } catch (error) {
        console.error('Error processing queued message:', error);
        resolve({ status: 'error', error: error as Error });
      }
    }
  }
}

function handleError(error: Error) {
  console.error('An error occurred:', error.message);
  // Display a user-friendly error message
  // chrome.notifications.create({
  //   type: 'basic',
  //   title: 'Error',
  //   message: 'An error occurred. Please try again later.',
  //   iconUrl: 'icon-128.png'
  // });
}