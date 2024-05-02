import Anthropic from '@anthropic-ai/sdk';
import prompts from '../../public/defaultPrompts.json';

import { Prompt } from '../common/types'
import { calculateHash } from "../common/utils";
import { PageMetadata, TextNode, WebPageDiacritizationData } from '../common/dataClass';

import { arabicToArabizi } from './arabizi';
import { defaultModel, anthropicAPICall, countSysPromptTokens, escalateModel } from './anthropicCaller'
import { getAPIKey, DiacritizationDataManager } from './datamanager';

// ----------------- Event Listeners ----------------- //

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("ArabEasy successfully installed! Thank you for using this app.");
  } else if (details.reason == "update") {
    var thisVersion = chrome.runtime.getManifest().version;
    console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
  }
});

chrome.runtime.onInstalled.addListener(() => {
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
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {

  // Get the system prompt length
  if (request.action === "getSystemPromptLength") {
    const prompt = request.prompt;
    countSysPromptTokens(prompt).then((tokens) => sendResponse(tokens));
    return true;
  }

  if (request.action === "getWebsiteData") {
    async function getWebsiteData() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id === undefined) throw new Error('No active tab found');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteData' });
        console.log('Website data at background:', response);
        sendResponse(response);
      } catch (error) {
        console.error('Failed to get complete website data:', error);
      };
    };
    getWebsiteData();
    return true;
  }

  // Handle the diacritization request
  if (request.action === "sendToDiacritize" && request.method) {
    console.log('Received diacritization request');
    const method: string = request.method;

    async function processDiacritizationRequest() {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id === undefined) throw new Error('No active tab found');
        else console.log('Active tab found:', tab.url, tab.id);
        const pageUrl = tab.url as string;
        const urlHash = await calculateHash(pageUrl);

        // Get the site's current metadata
        console.log('Getting website metadata');
        const pageMetadata: PageMetadata = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteMetadata' })
        const webPageDiacritizationData = await WebPageDiacritizationData.build(pageMetadata);
        console.log('Website metadata:', pageMetadata);

        // Load the saved data for the current webpage
        console.log('Checking for saved data');
        const retrievedPageData = await dataManager.getWebPageData(urlHash);
        console.log('Retrieved page data:', retrievedPageData);

        // check current and saved data
        if (retrievedPageData) {
          console.log('current:', pageMetadata.contentSignature, 'saved:', retrievedPageData.metadata.contentSignature);

          if (retrievedPageData.metadata.contentSignature === pageMetadata.contentSignature) {
            if (!!retrievedPageData.diacritizations[method]) {
              console.log(typeof retrievedPageData)
              await chrome.tabs.sendMessage(tab.id, {
                action: 'updateWebsiteText',
                original: retrievedPageData.getDiacritization(method),
                diacritization: retrievedPageData.getDiacritization(method),
                method: method
              });
              console.log('No changes detected, returning saved data.');
              sendResponse({ message: 'No changes detected, returning saved data.' });
              return;

            } else {
              console.log('Webpage is unchanged, generating', method, 'from saved data');
              webPageDiacritizationData.diacritizations = retrievedPageData.diacritizations
            }

          } else {
            console.log('Content has changed, will update the saved data, continuing');
            logChanges(retrievedPageData.metadata, pageMetadata);
          }

        } else {
          console.log('No saved data found for the current webpage, continuing');
        }

        // Get the website text
        if (!webPageDiacritizationData.diacritizations['original']) {
          console.log('Getting website text');
          const websiteText: TextNode[] = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteText' });
          console.log('Website text:', websiteText);
          await webPageDiacritizationData.createOriginal(websiteText);
        }
        const diacritizedText = await processWebpage(method, webPageDiacritizationData, tab.id)

        // Process the diacritization batches
        console.log('Processing diacritization');

        // Wait until original is loaded on webPageDiacritizationData, then addDiacritization
        console.log('Adding diacritization to saved data');
        await webPageDiacritizationData.addDiacritization(diacritizedText, method);

        // Update the saved metadata
        console.log('Updating saved web page data');
        await dataManager.updateWebPageData(urlHash, webPageDiacritizationData)
          .catch((error) => console.error('Failed to update web page data:', error))
          .then(() => console.log('Saved webpage data updated:', webPageDiacritizationData));

        // Update the website text
        const original = webPageDiacritizationData.getDiacritization('original');
        const diacritization = webPageDiacritizationData.getDiacritization(method);
        console.log('Updating website text');
        await chrome.tabs.sendMessage(tab.id, { action: 'updateWebsiteText', original, diacritization, method });
        console.log('Website text updated');
        sendResponse({ message: 'Completed.' });

      } catch (error) {
        console.error('Error processing diacritization:', error);
        sendResponse({ error: 'Failed to process diacritization.' });
      }
    };

    processDiacritizationRequest();
    return true;
  }

  // Clear the database
  if (request.action === "clearDatabase") {
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
    async function processDiacritizationRequest() {
      if (tab && tab.id) {
        const request = await chrome.tabs.sendMessage(tab.id, { action: "getSelectedNodes" });
        const selectedNodes: TextNode[] = request.nodes;
        console.log("Selected Nodes:", selectedNodes);
        const diacritization = await fullDiacritization(selectedNodes, tab.id)
        console.log('result:', diacritization);
        await chrome.tabs.sendMessage(tab.id, { action: 'updateWebsiteText', original: selectedNodes, diacritization, method: 'diacritize' });
      }
    }
    await processDiacritizationRequest();
    console.log('Website text updated');
  }
});


// ----------------- Functions ----------------- //

const dataManager = DiacritizationDataManager.getInstance();
const delimiter = '|';
const sentenceRegex = /[.!?؟]+\s*\n*/g;
const defaultPrompt: Prompt = prompts[1];

async function getPrompt(): Promise<Prompt> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const prompt: Prompt = data.selectedPrompt || defaultPrompt;
        resolve(prompt);
      }
    });
  });
}

// Async worker for API call
async function processWebpage(method: string, data: WebPageDiacritizationData, tabId: number): Promise<TextNode[]> {

  // If the method is 'diacritize' and saved data exists for the current webpage, return the saved results
  if (method === 'diacritize') {
    console.log('Received diacritization request and data, processing');
    const websiteText: TextNode[] = data.getDiacritization('original')
    return await fullDiacritization(websiteText, tabId);

  } else if (method === 'arabizi') {

    console.log('Received arabizi request and data, processing');
    let fullDiacritics: TextNode[] = []

    if (data.diacritizations['diacritize']) {
      fullDiacritics = data.getDiacritization('diacritize')
      console.log('Diacritization inferred to exist, transliterating')

    } else {
      console.log('Diacritizing text first')
      fullDiacritics = await processWebpage('diacritize', data, tabId)
      // wait!!! but we want it to store the results! or we need to pass them out of here somehow!!!
    }

    console.log('Full diacritics:', fullDiacritics)
    const result = arabicToArabizi(fullDiacritics.map((element) => element.text))
    const diacritizedNodes: TextNode[] = fullDiacritics.map((node, index) => {
      return {
        ...node,
        text: result[index]
      };
    });
    return diacritizedNodes

  } else {
    console.error(method + ' is not implemented yet')
    throw new Error(method + ' is not implemented yet');
  }

};

async function fullDiacritization(websiteText: TextNode[], tabId: number): Promise<TextNode[]> {
  const diacritizationBatches = createDiacritizationElementBatches(websiteText, 750);
  const texts = createAPIBatches(diacritizationBatches);
  const resultBatches = await diacritizeTexts(texts, diacritizationBatches, tabId);
  console.log('resultBatches:', resultBatches);
  const result = resultBatches.flatMap((batch) => batch.split(delimiter))
  const diacritizedNodes: TextNode[] = websiteText.map((node, index) => {
    return {
      ...node,
      text: result[index]
    };
  });
  return diacritizedNodes;
}

function logChanges(saved: PageMetadata, current: PageMetadata): void {
  const currentStructure = current.structuralMetadata;
  const savedStructure = saved.structuralMetadata;

  const diff: Record<string, { current: unknown; saved: unknown }> = {};

  Object.keys(currentStructure).forEach((key: string) => {
    if (!isEqual(currentStructure[key], savedStructure[key])) {
      diff[key] = {
        current: currentStructure[key],
        saved: savedStructure[key],
      };
    }
  });

  if (Object.keys(diff).length > 0) {
    console.log('Differences:');
    console.log(JSON.stringify(diff, null, 2));
  } else {
    console.log('No differences found.');
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  return a === b;
}

// Create batches of elements according to sentence boundaries and API character limit.
function createDiacritizationElementBatches(textElements: TextNode[], maxChars: number): TextNode[][] {
  console.log('starting batching on', textElements.length, 'elements')
  const textElementBatches: TextNode[][] = [];
  let currentBatch: TextNode[] = [];
  let currentBatchLength = 0;
  let batchLengths: [number, string, TextNode[]][] = []

  textElements.forEach((textElement, index) => {
    const text = textElement.text
    if (text != '') {
      // if (containsArabicCharacters(text)) {
      // we want to take these out, but doing so might cause us to lose context within sentences.
      // once we have better batch management with sentences paragraphs etc, we can then address this.
      const textLength = text.length;

      if ((currentBatchLength + textLength) > maxChars) {
        if (currentBatch.length > 0) {
          batchLengths.push([currentBatchLength, 'maxChars', currentBatch]);
          textElementBatches.push(currentBatch);
        }
        currentBatch = [textElement];
        currentBatchLength = textLength;
      } else {
        currentBatch.push(textElement);
        currentBatchLength += textLength;

        // handle sentence breaks as new batch        
        if ((text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))) || index === (textElements.length - 1)) {
          batchLengths.push([currentBatchLength, 'end of sentence', currentBatch]);
          textElementBatches.push(currentBatch);
          currentBatch = [];
          currentBatchLength = 0
        }
      }
    }
  });
  console.log("batches created:", textElementBatches.length);
  console.log(batchLengths);

  return textElementBatches;
}

// Check whether there are any Arabic characters. Not used
// function containsArabicCharacters(text: string): boolean {
//   const arabicRegex = /[\u0600-\u06FF]/;
//   return arabicRegex.test(text);
// }

// Prepare batches for API by extracting the text with delimiters.
function createAPIBatches(textElementBatches: TextNode[][]): string[] {
  const diacritizationBatches: string[] = [];

  textElementBatches.forEach((batch) => {
    const batchText = batch.map((textElement) => textElement.text.replace(delimiter, ''))
      .join(delimiter);
    diacritizationBatches.push(batchText);
  });

  return diacritizationBatches;
}


// API Call for Diacritization
async function diacritizeTexts(texts: string[], textElementBatches: TextNode[][], tabId: number): Promise<string[]> {
  const apiKey = await getAPIKey();
  const diacritizePrompt = await getPrompt() || defaultPrompt;
  const promptText = diacritizePrompt.text;
  const sysPromptLength = await countSysPromptTokens(promptText) || 0;

  chrome.tabs.sendMessage(tabId, { action: 'diacritizationBatchesStarted', batches: texts.length });

  // parameters for retrying
  const fudgefactor = 1;
  const maxTries = 1;

  // diacritize the texts in parallel with retries
  const diacritizedTexts = await Promise.all(
    texts.map(async (arabicTextChunk, index) => {
      for (let tries = 0; tries < maxTries; tries++) {
        const model = escalateModel(defaultModel, tries).currentVersion
        try {
          const response = await callAnthropicAPI(
            arabicTextChunk,
            promptText,
            apiKey,
            model,
          );

          const diacritizedText: string = response.content[0].text;
          console.log(arabicTextChunk);
          console.log(diacritizedText);

          // check the token output: should be more than the input
          const inputTokens = response.usage.input_tokens - sysPromptLength;
          const outputTokens = response.usage.output_tokens;
          console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
          const enoughTokens = outputTokens > inputTokens;

          // check if the diacritized text is longer than the original text
          const separatorsInOriginal = arabicTextChunk.split(delimiter).length - 1;
          const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
          console.log('Separators in original:', separatorsInOriginal, 'Separators in diacritized:', separatorsInDiacritized);
          const rightDelimiters = separatorsInDiacritized + fudgefactor >= separatorsInOriginal;

          if (enoughTokens && rightDelimiters) {
            chrome.tabs.sendMessage(tabId, {
              action: 'diacritizationChunkFinished',
              original: textElementBatches[index],
              diacritization: diacritizedText.split(delimiter),
              method: 'diacritize'
            });
            return diacritizedText;
          } else {
            console.log('Too short or wrong separators, trying again: try', tries, 'of', maxTries);
          }
        } catch (error) {
          console.error('Error diacritizing chunk:', error);
          break;
        }
      }
      return arabicTextChunk;
      // send a message to a listener that a chunk has finished
    })
  );
  console.log('Finished diacritizing.');
  return diacritizedTexts;
}

// Function to construct the message and make the API call
async function callAnthropicAPI(
  arabicTextChunk: string,
  promptText: string,
  apiKey: string,
  model: string,
): Promise<Anthropic.Message> {
  const msg: Anthropic.Messages.MessageCreateParams = {
    model: model,
    max_tokens: 4000,
    temperature: 0,
    system: promptText,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: arabicTextChunk,
          }
        ]
      }
    ]
  };

  const response: Anthropic.Message = await anthropicAPICall(msg, apiKey);
  return response;

}