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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  console.log('Received message:', message.action);
  try {

    switch (message.action) {
      case 'widgetHandshake':
        console.log('Widget handshake received.');
        sendResponse({ success: true });
        break;

      case 'contentLoaded':
        console.log('Content loaded.');
        contentScriptReady = true;
        processQueuedMessages();
        sendResponse({ success: true });
        break;

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

      case 'openOptionsPage':
        chrome.runtime.openOptionsPage();
        break;

      case 'getWebsiteData':
        (async () => {
          tab = await getActiveTab();
          messageContentScript(tab.id, { action: 'getWebsiteData' })
            .then((websiteData) => sendResponse({ websiteData }))
            .catch((error) => sendResponse({ error: error.message }));
        })();
        return true;

      case 'getSavedDiacritizations':
        getSavedInfo()
          .then((savedInfo) => {
            console.log(savedInfo)
            sendResponse({ savedInfo })
          })
          .catch((error) => {
            console.log(error);
            sendResponse({ error: error.message })
          });
        return true;

      // Handle the diacritization request
      case 'sendToDiacritize':
        if (message.method) {
          processFullWebpage(message.method)
        };
        sendResponse({ success: true });
        break;

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
    processSelectedText(tab!, 'fullDiacritics')
      .then(() => {
        console.log('Website text updated with diacritics.');
      })
      .catch((error) => {
        handleError(error);
      });
  } else if (info.menuItemId === "romanizeSelectedText") {
    console.log("Romanizing selected text...");
    processSelectedText(tab!, 'arabizi')
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
      getActiveTab().then((tab) => {
        messageContentScript(tab.id, { action: 'toggleWidget' });
      });
      break;
  }
});

// ----------------- Functions ----------------- //

let contentScriptReady = false;
export let tab: { id: number, url: string } = { id: 0, url: '' };
const messageQueue: any = [];
export const dataManager = DiacritizationDataManager.getInstance();

async function getSavedInfo() {
  await dataManager.getWebPageData(tab.url)
    .then((response) => {
      const savedDiacritizations = (Object.keys(response?.diacritizations || {})).filter((key) => (key !== 'original'));
      return (savedDiacritizations);
    })
    .catch((error) => { throw error });
}

async function clearWebsiteData() {
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
    const { tabId, message, resolve } = messageQueue.shift();
    try {
      const response = await messageContentScript(tabId, message);
      resolve(response);
    } catch (error) {
      console.error('Error processing queued message:', error);
      resolve(null); // Resolve with null to indicate an error occurred
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