import { countSysPromptTokens } from './anthropicCaller'
import { AppMessage, AppResponse } from '../common/types';
import { processText } from './processTextNodes';
// @ts-expect-error No types for "bottleneck/light"
import BottleneckLight from "bottleneck/light.js";
import { ExtensionOptions } from '../common/optionsClass';

// ----------------- Event Listeners ----------------- //

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

  const defaultOptions = new ExtensionOptions();

  for (const [key, value] of Object.entries(defaultOptions)) {
    chrome.storage.sync.get(key, (result) => {
      if (result[key] === undefined) {
        chrome.storage.sync.set({ [key]: value });
      }
    });
  }

  chrome.contextMenus.create({
    id: "fullDiacritics",
    title: "Diacritize Selection",
    contexts: ["selection"]
  }, () => onError);

  chrome.contextMenus.create({
    id: "arabizi",
    title: "Transliterate Selection",
    contexts: ["selection"]
  }, () => onError);

  function onError() {
    if (chrome.runtime.lastError) {
      console.error(`Error creating context menu: ${chrome.runtime.lastError.message}`);
    }
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  console.log(`Storage change detected in ${area} area.`);
  if (area === 'sync') {
    console.log('Changes:', changes);

    for (const [key, value] of Object.entries(changes)) {
      if (extensionOptions[key] === undefined) {
        console.warn(`Invalid option: ${key}`);
        continue;
      }

      extensionOptions[key] = value.newValue;
    }

    if (changes.maxConcurrent || changes.waitTime) {
      console.log('Updating scheduler settings:', extensionOptions.maxConcurrent, extensionOptions.waitTime);
      scheduler.updateSettings({
        maxConcurrent: extensionOptions.maxConcurrent,
        minTime: extensionOptions.waitTime
      });
    }
  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (!tab) return;
  console.log(`Context menu item clicked: ${info.menuItemId}`);

  try {
    switch (info.menuItemId) {
      case "fullDiacritics":
        await processText(tab, 'fullDiacritics');
        break;
      case "arabizi":
        await processText(tab, 'arabizi');
        break;
      default:
        throw new Error(`Unknown context menu item: ${info.menuItemId}`);
    }
    console.log(`Website text updated successfully.`);

  } catch (error) {
    console.warn(`Could not process selected text: ${error}`);
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
          messageContentScript(tab.id, { action: 'toggleWidget' });
        });
      break;
  }
});

chrome.runtime.onMessage.addListener((message: AppMessage, sender, sendResponse: (response: AppResponse) => void) => {

  const messageSource = sender.tab?.index ? `extension script in tab #${sender.tab.index + 1}` : 'popup';
  console.log(`Received message: ${message.action} from ${messageSource}`);

  const actionHandlers: Record<string, (tab: chrome.tabs.Tab, message: AppMessage) => Promise<Partial<AppResponse>>> = {
    'cancelTask': handleCancelTask,
    'getSystemPromptLength': handleGetSystemPromptLength,
    'processText': handleProcessText,
    'openOptions': handleOpenOptions,
  };

  const handler = actionHandlers[message.action];

  if (!handler) {
    console.warn(`Invalid action: ${message.action}`);
    sendResponse({ status: 'error', errorMessage: 'Invalid action' });
  }

  (async () => {
    const tab = sender.tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    try {
      const response = await handler(tab, message);
      sendResponse({ status: 'success', ...response });
    } catch (error) {
      console.warn(`Error processing ${message.action}: ${error}`);
      sendResponse({ status: 'error', errorMessage: (error as Error).message });
    }
  })();

  return true;

  async function handleProcessText(tab: chrome.tabs.Tab, message: AppMessage): Promise<Partial<AppResponse>> {
    return processText(tab, message.method ?? 'fullDiacritics', message.wholePage ?? false);
  }

  async function handleGetSystemPromptLength(): Promise<Partial<AppResponse>> {
    return { tokenLength: await countSysPromptTokens() };
  }

  async function handleCancelTask(tab: chrome.tabs.Tab): Promise<Partial<AppResponse>> {
    cancelTask(tab.id!);
    return {};
  }

  async function handleOpenOptions(): Promise<Partial<AppResponse>> {
    chrome.runtime.openOptionsPage();
    return {};
  }
});

// ----------------- Functions ----------------- //

export const extensionOptions = new ExtensionOptions();

chrome.storage.sync.get(null, (result) => {
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(extensionOptions, key)) {
      extensionOptions[key] = result[key];
    }
  }
  console.log('Loaded options:', extensionOptions);
});

export function messageContentScript(tabId: number, message: AppMessage): Promise<AppResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage<AppMessage, AppResponse>(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // TODO: send all errors through the errorMessage event
        console.error('Error sending message:', message);
        reject(chrome.runtime.lastError);
      } else {
        resolve(response ?? { status: 'error', error: new Error('No response') });
      }
    });
  });
}

// TODO: should this be a class?
const schedulerOptions: BottleneckLight.ConstructorOptions = {
  maxConcurrent: extensionOptions.maxConcurrent,
  minTime: extensionOptions.waitTime
}

export let scheduler = new BottleneckLight(schedulerOptions);

export const controllerMap = new Map<number, AbortController>();

export function cancelTask(tabId: number) {
  if (controllerMap.has(tabId)) {
    const controller = controllerMap.get(tabId);
    controller?.abort();
    scheduler.stop();
    controllerMap.delete(tabId);
    scheduler = new BottleneckLight(schedulerOptions);
  }
}