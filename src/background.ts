import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './defaultPrompts.json';
import { Prompt, TransliterationDict } from './types';
import { PageMetadata, TextNode, WebPageDiacritizationData } from './dataClass';
import { defaultModel, anthropicAPICall, countSysPromptTokens, escalateModel } from './anthropicCaller'
import { DiacritizationDataManager } from './datamanager';
import { getAPIKey, calculateHash } from "./utils";


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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Get the system prompt length
  if (request.action === "getSystemPromptLength") {
    const prompt = request.prompt;
    countSysPromptTokens(prompt).then((tokens) => sendResponse(tokens));
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

        // Get the site's current metadata
        console.log('Getting website metadata');
        const pageMetadata: PageMetadata = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteMetadata' })
        console.log('Website metadata:', pageMetadata);

        // Load the saved data for the current webpage
        console.log('Checking for saved data');
        const urlHash = await calculateHash(pageUrl);
        const retrievedPageData = await dataManager.getWebPageData(urlHash);
        console.log('Retrieved page data:', retrievedPageData);
        if (!retrievedPageData) {
          console.log('No saved data found for the current webpage, continuing');
        } else if (retrievedPageData.metadata.contentSignature === pageMetadata.contentSignature) {
          // will just return the saved data if the content hasn't changed
          await chrome.tabs.sendMessage(tab.id, { action: 'updateWebsiteText', data: retrievedPageData, method });
          sendResponse({message: 'No changes detected, returning saved data.'});
        } else {
          console.log('Content has changed, updating the saved data');
        }

        // Get the website text
        console.log('Getting website text');
        const websiteText: TextNode[] = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteText' });
        console.log('Website text:', websiteText);

        const webPageDiacritizationData = await WebPageDiacritizationData.build(
          pageMetadata,
        );

        // Process the diacritization batches
        console.log('Processing diacritization');
        await webPageDiacritizationData.createOriginal(websiteText);
        const diacritizedText = await processDiacritizationBatches(method, websiteText)
        
        // Wait until original is loaded on webPageDiacritizationData, then addDiacritization
        console.log('Adding diacritization to saved data');
        await webPageDiacritizationData.addDiacritization(diacritizedText, method);

        // Update the saved metadata
        console.log('Updating saved web page data');
        await dataManager.updateWebPageData(pageUrl, webPageDiacritizationData)
          .catch((error) => console.error('Failed to update web page data:', error))
          .then(() => console.log('Saved webpage data updated:', webPageDiacritizationData));

        // Update the website text
        const diacritization = await webPageDiacritizationData.getDiacritization(method);
        const { original } = webPageDiacritizationData;
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

// ----------------- Functions ----------------- //

const dataManager = DiacritizationDataManager.getInstance();
const delimiter = '|';
const sentenceRegex = /[.!?؟]+\s*\n*/g;
const defaultPrompt: Prompt = prompts[0];

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
async function processDiacritizationBatches(method: string, websiteText: TextNode[]): Promise<TextNode[]> {
  
  const diacritizationBatches = createDiacritizationElementBatches(websiteText, 750);
  const texts = createAPIBatches(diacritizationBatches);
  let resultingTexts: string[] = [];
  
  // If the method is 'diacritize' and saved data exists for the current webpage, return the saved results
  if (method === 'diacritize') {

    console.log('Just returning originals for mock')
    resultingTexts = texts;

    // console.log('Received diacritization request and data, processing');
    // resultingTexts = await diacritizeTexts(texts);

  } else if (method === 'arabizi') {

    throw new Error('Not implemented yet');
    
    // // honestly, this could just be generated automatically and toggled on/off back to full arabic cache state
    // // could also be fun to do a "wubi" version on alternating lines?
    // console.log('Received arabizi request and data, processing');
    // if (cache && cache.length) {
    //   console.log('Diacritization inferred to exist, transliterating')
    //   diacritizedTextArray = arabicToArabizi(cache.map((batch) => batch.rawResult));
    // } else {
    //   console.log('Diacritizing text first')
    //   const diacritizeArray = await diacritizeTexts(texts);
    //   diacritizedTextArray = arabicToArabizi(diacritizeArray)
    // }
  }

  // Store the diacritized results using DiacritizationDataManager methods
  const diacritizedTexts = resultingTexts.flatMap((text) => text.split(delimiter));
  const diacritizedNodes = websiteText.map((node, index) => {
    return {
      ...node,
      text: diacritizedTexts[index]
    };
  });

  console.log('Diacritized text:', diacritizedNodes);
  return diacritizedNodes ;

};

// Create batches of elements according to sentence boundaries and API character limit.
function createDiacritizationElementBatches(textElements: TextNode[], maxChars: number): TextNode[][] {
  console.log('starting batching on', textElements.length, 'elements')
  const textElementBatches: TextNode[][] = [];
  let currentBatch: TextNode[] = [];
  let currentBatchLength = 0;
  let batchLengths: [number, string, TextNode[]][] = []

  textElements.forEach((textElement) => {
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
        if (text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))) {
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
  textElementBatches.forEach(batch => {
  });
  return textElementBatches;
}

// Check whether there are any Arabic characters. Not used
function containsArabicCharacters(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

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
async function diacritizeTexts(texts: string[]): Promise<string[]> {

  const apiKey = await getAPIKey();

  const diacritizePrompt = await getPrompt() || defaultPrompt;
  const promptText = diacritizePrompt.text;
  const sysPromptLength = await countSysPromptTokens(promptText) || 0;

  // parameters for retrying
  const fudgefactor = 1
  const maxTries = 1

  // diacritize the texts in parallel with retries
  const diacritizedTexts = await Promise.all(texts.map(async (arabicTextChunk) => {

    for (let tries = 0; tries < maxTries; tries++) {
      const msg: Anthropic.Messages.MessageCreateParams = {
        model: escalateModel(defaultModel, tries).currentVersion,
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
      try {
        const response = await anthropicAPICall(msg, apiKey);

        // check the token usage
        const inputTokens = response.usage.input_tokens - sysPromptLength;
        const outputTokens = response.usage.output_tokens;
        console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
        const enoughTokens = outputTokens > inputTokens;

        const diacritizedText: string = response.content[0].text;
        console.log(arabicTextChunk);
        console.log(diacritizedText);

        // check if the diacritized text is longer than the original text
        const separatorsInOriginal = arabicTextChunk.split(delimiter).length - 1;
        const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
        console.log('Separators in original:', separatorsInOriginal, 'Separators in diacritized:', separatorsInDiacritized);
        const rightDelimiters = separatorsInDiacritized + fudgefactor >= separatorsInOriginal;

        if (enoughTokens && rightDelimiters) {
          return diacritizedText;
        } else {
          console.log('Too short or wrong separators, trying again: try', tries, 'of', maxTries);
        }
      }
      catch (error) {
        console.error('Error diacritizing chunk:', error);
        break;
      }
    }
    return arabicTextChunk;
  }));
  console.log('Finished diacritizing.')
  return diacritizedTexts;
}

// Arabizi diacritization
// still need to do a lot of things: sun/moon transformation
// fii instead of fiy, etc
// man, maybe there's even different pronunciation choices for dialects...? too much to consider...
// simple one: get the punctuation marks to change to english equivs

function arabicToArabizi(texts: string[], transliterationDict: TransliterationDict = arabizi.transliteration): string[] {
  return texts.map(arabicText =>
    arabicText
      .replace(/[ْ]/g, '') // remove sukoon
      .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2') // replace all cases of shadda with previous letter
      .split('')
      .map(char => transliterationDict[char]
        ?.[0] || char).join('')
  );
}

// ALLCAPS diacritization function <for fun>
function ALLCAPS(str: string): string {
  return str.replace(/[a-z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    return String.fromCharCode(charCode - 32);
  });
}