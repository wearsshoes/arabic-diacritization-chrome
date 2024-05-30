import { countSysPromptTokens } from './anthropicCaller'
import { AppMessage, AppResponse } from '../common/types';
import { processText } from './processTextNodes';
// @ts-expect-error No types for "bottleneck/light"
import BottleneckLight from "bottleneck/light.js";

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
    'cancelTask': handleCancelTask,
    'getSystemPromptLength': handleGetSystemPromptLength,
    'getWebsiteData': handleGetWebsiteData,
    'getSavedDiacritizations': handleGetSavedDiacritizations,
    'clearWebpageData': handleClearWebpageData,
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
    processText(tab, 'fullDiacritics')
      .then(() => {
        console.log('Website text updated with diacritics.');
      })
      .catch((error) => {
        console.error(`Could not diacritize selected text: ${error}`);
      });
  } else if (info.menuItemId === "romanizeSelectedText") {
    console.log("Transliterating selected text...");
    processText(tab, 'arabizi')
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

// ----------------- Handlers ----------------- //


async function handleProcessWebpage(message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab) tab = sender.tab;
  else tab = await getActiveTab();
  return processText(tab, message.method ?? 'fullDiacritics', true)
    .then((result) => {
      return result;
    })
    .catch((error) => {
      return { status: 'error', error: new Error(`Error caught at handleProcessWebpage: ${error}`) };
    });

}

async function handleProcessSelection(message: AppMessage, sender: chrome.runtime.MessageSender): Promise<AppResponse> {
  let tab: chrome.tabs.Tab;
  if (sender.tab) tab = sender.tab;
  else tab = await getActiveTab();
  return processText(tab, message.method ?? 'fullDiacritics', false)
    .then((result) => {
      return result;
    })
    .catch((error) => {
      return { status: 'error', error: new Error(`Error caught at handleProcessSelection: ${error}`) };
    });
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

async function handleGetSystemPromptLength(message: AppMessage): Promise<AppResponse> {
  if (message.prompt) {
    const tokens = await countSysPromptTokens(message.prompt);
    return { status: 'success', tokens }
  } else {
    return { status: 'error', error: new Error('No prompt to count') }
  }
}

async function handleClearWebpageData(): Promise<AppResponse> {
  const tab = await getActiveTab()
  if (!tab.url) throw new Error('No URL to clear saved info for..');
  await chrome.storage.local.remove(tab.url);
  if (tab.id) chrome.tabs.reload(tab.id);
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

  async function getSavedInfo(tab: chrome.tabs.Tab): Promise<string[]> {
    if (!tab.url) throw new Error('No URL to get saved info for.');
    const response = await chrome.storage.local.get(tab.url);
    const savedDiacritizations = (Object.keys(response?.diacritizations || {})).filter((key) => (key !== 'original'));
    return savedDiacritizations;
  }
}

// ----------------- Functions ----------------- //

export function messageContentScript(tabId: number, message: AppMessage): Promise<AppResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage<AppMessage, AppResponse>(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', message);
        reject(chrome.runtime.lastError);
      } else {
        resolve(response ?? { status: 'error', error: new Error('No response') });
      }
    });
  });
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]);
}

// TODO: should this be a class?
const schedulerOptions: BottleneckLight.ConstructorOptions = { maxConcurrent: 3, minTime: 1500 }
export let scheduler = new BottleneckLight(schedulerOptions);
export const controllerMap = new Map<number, AbortController>();

function cancelTask(tabId: number) {
  if (controllerMap.has(tabId)) {
    const controller = controllerMap.get(tabId);
    controller?.abort();
    scheduler.stop();
    controllerMap.delete(tabId);
    scheduler = new BottleneckLight(schedulerOptions);
  }
}