import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './defaultPrompts.json';
import { calculateHash, getAPIKey } from './utils';  
import { Prompt, TransliterationDict, ProcessorResponse, WebPageDiacritizationData, DiacritizationElement, DiacritizationRequestBatch } from './types';
import { defaultModel, anthropicAPICall, countSysPromptTokens, escalateModel } from './anthropicCaller'
import { DiacritizationDataManager } from './datamanager';

// ----------------- Event Listeners ----------------- //

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    console.log("ArabEasy successfully installed! Thank you for using this app.");
  }else if(details.reason == "update"){
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
    const { method, cache } = request;

    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id === undefined) throw new Error('No active tab found');

        const websiteText = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteText' });
        const diacritizationBatches = websiteText.data;
        console.log('Website text received:', diacritizationBatches);
  
        const diacritizedText = await processDiacritizationBatches(method, cache, diacritizationBatches);
  
        await chrome.tabs.sendMessage(tab.id, {action: 'updateWebsiteText', data: diacritizedText, method});  
        sendResponse({ message: 'Completed.' });

      } catch (error) {
        console.error('Error processing diacritization:', error);
        sendResponse({ error: 'Failed to process diacritization.' });
      }
    })();
  
    return true;
  }

});

// ----------------- Functions ----------------- //

const dataManager = DiacritizationDataManager.getInstance();
const delimiter = '|';
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
// TODO: try to get this to take and return objects of the class WebPageDiacritizationData
async function processDiacritizationBatches(method: string, cache: ProcessorResponse[], diacritizationBatches: DiacritizationRequestBatch[]): Promise<ProcessorResponse[]> {
  
  const texts = diacritizationBatches.map((batch) => batch.text);
  
  // Replace the caching logic with DiacritizationDataManager methods
  const pageUrl = await getCurrentPageUrl(); // Implement this function to get the current page URL
  const webPageData = await dataManager.getWebPageData(pageUrl);
  if (!webPageData) {
    console.log('No saved data found for the current webpage');
  }
  // these seem like slightly redundant calls, might be able to refactor them later
  // need to live in content script.
  const contentSignature = await dataManager.calculateContentSignature(document.body.querySelectorAll('*'));
  // const contentSignature = '';
  const structuralMetadata = dataManager.serializeStructureMetadata(document.body.querySelectorAll('*'));
  // const structuralMetadata = '';

  const webPageDiacritizationData = new WebPageDiacritizationData(
    pageUrl,
    new Date(),
    contentSignature,
    structuralMetadata,
    {}
  );
  await dataManager.updateWebPageData(pageUrl, webPageDiacritizationData)
    .catch((error) => console.error('Failed to update web page data:', error))
    .then(() => console.log('Web page data updated:', webPageDiacritizationData));

  throw new Error('Not implemented yet');
  
  // probably making a bunch of unnecessary calls to the database here

  let diacritizedTextArray: string[] = [];

  // If the method is 'diacritize' and saved data exists for the current webpage, return the saved results
  if (method === 'diacritize') {
  //   if (webPageData) {
  //     // If saved data exists for the current webpage and the method is 'diacritize'
  //     const savedResults = Object.values(webPageData.elements).map(element => element.diacritizedText);
  //     return diacritizationBatches.map((batch, index) => {
  //       const diacritizedTexts = savedResults[index].split(delimiter);
  //       return { elements: batch.elements, diacritizedTexts: diacritizedTexts, rawResult: savedResults[index] };
  //     });
  //   }

    // could be fun to have claude run with figuring out the dialect, and then feeding that as an argument to the prompt
    // partial diacritization... just build out a lot of options...
    
    console.log('Received diacritization request and data, processing');
    const diacritizeArray = await diacritizeTexts(texts);
    diacritizedTextArray = diacritizeArray
  
  } else if (method === 'arabizi') {
    // honestly, this could just be generated automatically and toggled on/off back to full arabic cache state
    // could also be fun to do a "wubi" version on alternating lines?
    console.log('Received arabizi request and data, processing');
     if (cache && cache.length) {
      console.log('Diacritization inferred to exist, transliterating')
      diacritizedTextArray = arabicToArabizi(cache.map((batch) => batch.rawResult));
    } else {
      console.log('Diacritizing text first')
      const diacritizeArray = await diacritizeTexts(texts);
      diacritizedTextArray = arabicToArabizi(diacritizeArray)
    }
  }

  // Store the diacritized results using DiacritizationDataManager methods
  const diacritizedResults = diacritizationBatches.map((batch, index) => {
    const diacritizedTexts = diacritizedTextArray[index].split(delimiter);
    const rawResult = diacritizedTextArray[index];
    
    // batch.elements.forEach((element, elementIndex) => {
    //   const diacritizationElement: DiacritizationElement = {
    //     originalText: element.originalText,
    //     diacritizedText: diacritizedTexts[elementIndex],
    //     xPaths: [], // Implement the logic to generate XPaths for the element
    //     lastDiacritized: new Date(),
    //     attributes: {
    //       // TODO: haven't added these yet, TextElement should have these properties
    //       tagName: "",
    //       // tagName: element.tagName,
    //       className: "",
    //       // className: element.className,
    //       id: ""
    //       // id: element.id
    //     }
    //   };
    //   dataManager.updateElementData(pageUrl, element.elementId, diacritizationElement);
    // });

    return { elements: batch.elements, diacritizedTexts, rawResult };
  });

  return diacritizedResults;
}

// Get the current page URL
async function getCurrentPageUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        resolve(tabs[0].url as string);
      } else {
        reject('No active tabs found');
      }
    });
  });
}

// API Call for Diacritization
async function diacritizeTexts(texts: string[]): Promise<string[]> {
  
  const apiKey = await getAPIKey() || '';
  if (!apiKey) {
    throw new Error('API key not set');
  }
  
  const diacritizePrompt = await getPrompt() || defaultPrompt;
  const promptText = diacritizePrompt.text;
  const sysPromptLength = await countSysPromptTokens(promptText) || 0;
  
  // parameters for retrying
  const fudgefactor = 1
  const maxTries = 1

  // diacritize the texts in parallel with retries
  const diacritizedTexts = await Promise.all(texts.map(async (arabicText) => {
    const arabicTextHash = await calculateHash(arabicText);
    
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
                text: arabicText,
              }
            ]
          }
        ]
      };
      try {
        const response = await anthropicAPICall(msg, apiKey, arabicTextHash);

        // check the token usage
        const inputTokens = response.usage.input_tokens - sysPromptLength;
        const outputTokens = response.usage.output_tokens;
        console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
        const enoughTokens =  outputTokens > inputTokens;
        
        const diacritizedText: string = response.content[0].text;
        console.log(arabicText);
        console.log(diacritizedText);
        
        // check if the diacritized text is longer than the original text
        const separatorsInOriginal = arabicText.split(delimiter).length - 1;
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
    return arabicText;
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