import { countSysPromptTokens } from './anthropicCaller'
import { DiacritizationDataManager } from './datamanager';
import { getAPIKey } from "../common/utils";
import { AppMessage, AppResponse } from '../common/types';
import { processWebpage, processSelectedText } from './processTextNodes';

// ----------------- Event Listeners ----------------- //

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {

  if (details.reason == "install") {
    console.log("Easy Peasy Arabizi successfully installed! Thank you for using this app.");
  } else if (details.reason == "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    if (details.previousVersion === thisVersion) {
      console.log("Easy Peasy Arabizi refreshed.");
    } else {
      console.log("Easy Peasy Arabizi updated from " + details.previousVersion + " to " + thisVersion + "!");
    }
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

chrome.runtime.onMessage.addListener((message: AppMessage, sender, sendResponse: (response: AppResponse) => void) => {
  console.log(`Received message: ${message.action} from ${typeof sender.tab?.index === 'number' ? 'extension script in tab #' + (sender.tab.index + 1) : 'popup'}`);

  const actionHandlers: Record<string, (message: AppMessage, sender: chrome.runtime.MessageSender) => Promise<AppResponse>> = {
    'widgetHandshake': handleWidgetHandshake,
    'cancelTask': handleCancelTask,
    'getAPIKey': handleGetAPIKey,
    'getSystemPromptLength': handleGetSystemPromptLength,
    'openOptionsPage': handleOpenOptionsPage,
    'getWebsiteData': handleGetWebsiteData,
    'getSavedDiacritizations': handleGetSavedDiacritizations,
    'clearWebpageData': handleClearWebpageData,
    'clearDatabase': handleClearDatabase,
    'processWebpage': handleProcessWebpage,
    'processSelection': handleProcessSelection,
  };

  const handler = actionHandlers[message.action];

  if (handler) {
    handler(message, sender)
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error(`Error processing ${message.action}: ${error}`);
        sendResponse({ status: 'error', error: error as Error });
      });
    return true;
  } else {
    console.error(`Invalid action: ${message.action}`);
    sendResponse({ status: 'error', error: new Error('Invalid action') });
  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (!tab) {
    console.error(new Error(`${info.menuItemId}: ${tab} doesn't exist.`));
    return;
  }
  if (info.menuItemId === "processSelectedText") {
    processSelectedText(tab, 'fullDiacritics')
      .then(() => {
        console.log('Website text updated with diacritics.');
      })
      .catch((error) => {
        console.error(`Could not diacritize selected text: ${error}`);
      });
  } else if (info.menuItemId === "romanizeSelectedText") {
    console.log("Transliterating selected text...");
    processSelectedText(tab, 'arabizi')
      .then(() => {
        console.log('Website text updated to transliteration.');
      })
      .catch((error) => {
        console.error(`Could not transliterate selected text: ${error}`);
      });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) cancelTask(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  cancelTask(tabId);
});

chrome.commands.onCommand.addListener((command) => {
  console.log(`Command entered: ${command}`);
  switch (command) {
    case 'toggle-widget':
      chrome.tabs.query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab.id === undefined) throw new Error('No active tab found');
          chrome.tabs.sendMessage<AppMessage, AppResponse>(tab.id, { action: 'toggleWidget' });
        });
      break;
  }
});

// ----------------- Functions ----------------- //

export const dataManager = DiacritizationDataManager.getInstance();

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]);
}

async function getSavedInfo(tab: chrome.tabs.Tab): Promise<string[]> {
  if (!tab.url) throw new Error('No URL to get saved info for.');
  const response = await dataManager.getWebpageData(tab.url);
  const savedDiacritizations = (Object.keys(response?.diacritizations || {})).filter((key) => (key !== 'original'));
  return savedDiacritizations;
}

async function handleProcessWebpage(message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab) tab = sender.tab;
  else tab = await getActiveTab();
  processWebpage(tab, message.method ?? 'fullDiacritics')
  return ({ status: 'success' });
}

async function handleProcessSelection(message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab) tab = sender.tab;
  else tab = await getActiveTab();
  processWebpage(tab, message.method ?? 'fullDiacritics')
  return ({ status: 'success' });
}

async function handleWidgetHandshake(): Promise<AppResponse> {
  return { status: 'success' }
}

async function handleCancelTask(_message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  if (sender.tab && sender.tab.id) {
    cancelTask(sender.tab.id);
    return { status: 'success' }
  } else {
    console.error('No tab ID to cancel task');
    return { status: 'error', error: new Error('No tab ID to cancel task') }
  }
}

async function handleGetAPIKey(): Promise<AppResponse> {
  const key = await getAPIKey();
  return { status: 'success', key }
}

async function handleGetSystemPromptLength(message: AppMessage): Promise<AppResponse> {
  if (message.prompt) {
    const tokens = await countSysPromptTokens(message.prompt);
    return { status: 'success', tokens }
  } else {
    return { status: 'error', error: new Error('No prompt to count') }
  }
}

async function handleOpenOptionsPage(): Promise<AppResponse> {
  chrome.runtime.openOptionsPage();
  return { status: 'success' }
}

async function handleClearWebpageData(): Promise<AppResponse> {
  const tab = await getActiveTab()
  if (!tab.url) throw new Error('No URL to clear saved info for..');
  await dataManager.clearWebpageData(tab.url);
  if (tab.id) chrome.tabs.reload(tab.id);
  return { status: 'success' }
}

async function handleClearDatabase(): Promise<AppResponse> {
  await dataManager.clearAllData();
  return { status: 'success' }
}

async function handleGetWebsiteData(_message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab && sender.tab.id) tab = sender.tab;
  else tab = await getActiveTab();
  if (tab.id) {
    const websiteData = await messageContentScript(tab.id, { action: 'getWebsiteData' });
    return websiteData;
  } else {
    return { status: 'error', error: new Error('No tab ID to get website data') }
  }
}

async function handleGetSavedDiacritizations(_message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab && sender.tab.id) tab = sender.tab;
  else tab = await getActiveTab();
  if (tab.id) {
    const savedInfo = await getSavedInfo(tab);
    return { status: 'success', savedInfo };
  } else {
    return { status: 'error', error: new Error('No tab ID to get saved diacritizations') }
  }
}

export function messageContentScript(tabId: number, message: AppMessage): Promise<AppResponse> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage<AppMessage, AppResponse>(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', message);
          reject(chrome.runtime.lastError);
        } else {
          resolve(response !== undefined ? response : { status: 'error', error: new Error('No response') });
        }
      });
    });
  }

export const controllerMap = new Map<number, AbortController>();

function cancelTask(tabId: number) {
  if (controllerMap.has(tabId)) {
    const controller = controllerMap.get(tabId);
    controller?.abort();
    controllerMap.delete(tabId);
  }
}