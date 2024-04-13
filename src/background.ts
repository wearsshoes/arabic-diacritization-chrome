import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './defaultPrompts.json';
import Bottleneck from 'bottleneck'
import { calculateHash } from './utils';  
import { Model, Models, Prompt, ProcessorResponse, TextElement, SysPromptTokenCache, TransliterationDict } from './types';

// Rewriting control flow of the diacritization service
// Placeholder for the diacritization service
class DiacritizationService {
  // async checkAndUpdateCache(pageId, elementHash, text) { /* ... */ }
  // async fetchDiacritization(text) { /* ... */ }
  // async saveDiacritization(pageId, elementData) { /* ... */ }
  // async getDiacritization(pageId, elementHash) { /* ... */ }
}

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
      console.log("ArabEasy successfully installed! Thank you for using this app.");
  }else if(details.reason == "update"){
      var thisVersion = chrome.runtime.getManifest().version;
      console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
  }
});

const delimiter = '|';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSystemPromptLength") {
    const prompt = request.prompt;
    countSysPromptTokens(prompt).then((tokens) => sendResponse(tokens));
    return true;
  }
  if (request.action === "diacritize" && request.data) {
    // Process the diacritization batches received from the content script
    processDiacritizationBatches(request.method, request.cache, request.data)
      .then(diacritizedBatches => {
        sendResponse({type: 'diacritizationResult', data: diacritizedBatches});
      })
      .catch(error => {
        console.error('Error processing diacritization batches:', error);
        sendResponse({type: 'error', message: 'Failed to process diacritization batches'});
      });
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});

// Get API Key 
async function getAPIKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey'], (data: { apiKey?: string }) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        alert('ArabEasy: Please set your API key in the options page.');
      } else {
        const apiKey: string = data.apiKey || '';
        resolve(apiKey);
      }
    });
  });
}

const claude: Models = {
  haiku: {
    currentVersion: "claude-3-haiku-20240307",
    level: 0
  },
  sonnet: { 
    currentVersion: "claude-3-sonnet-20240229",
    level: 1
  },
  opus: {
    currentVersion: "claude-3-opus-20240229",
    level: 2
  }
};

const defaultModel: Model = claude.haiku;

function escalateModel (model: Model, n: number) : Model {
  // return the model whose level is one higher than the input model using map
    const mPlusOne = Object.values(claude).find((m) => m.level === model.level + n);
    if (mPlusOne) {
      return mPlusOne;
    } else {
      return model;
    }
} 

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

// Rate-limited Anthropic API call function
const anthropicLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 1500
});

async function anthropicAPICall(params: Anthropic.MessageCreateParams, key?: string, hash?: string): Promise<any> {
  
  // get the API key if it's not provided
  const apiKey = key || await getAPIKey();

  const anthropic = new Anthropic({ apiKey: apiKey });
  console.log('Queued job', hash); 
  return anthropicLimiter.schedule(async () => {
    try {
      console.log('Sent job', hash);
      const result = await anthropic.messages.create(params);
      console.log('Received result for:', hash);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  });
}

// Check number of system prompt tokens, look up in cache, or call API
async function countSysPromptTokens(prompt: string, model?: string): Promise<number> {
  const modelUsed = model || defaultModel.currentVersion;
  const promptHash = await calculateHash(prompt) as string;

  const storedTokenCount = await getStoredPromptTokenCount(promptHash, modelUsed);
  if (storedTokenCount !== null) {
    return storedTokenCount;
  }

  const msg = await anthropicAPICall({
    model: modelUsed,
    max_tokens: 1,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ]
  });

  const sysPromptTokens: number = msg.usage.input_tokens;
  saveSysPromptTokenCount(promptHash, modelUsed, sysPromptTokens);

  return sysPromptTokens;
}

async function getStoredPromptTokenCount(promptHash: string, model: string): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('savedResults', (data: { savedResults?: SysPromptTokenCache[] }) => {
      if (Array.isArray(data.savedResults)) {
        const storedPrompt = data.savedResults.find(
          (result) => result.hash === promptHash && result.model === model
        );
        if (storedPrompt) {
          return resolve(storedPrompt.tokens);
        }
      }
      resolve(null);
    });
  });
}

function saveSysPromptTokenCount(promptHash: string, model: string, tokens: number): void {
  chrome.storage.sync.get('savedResults', (data: { savedResults?: SysPromptTokenCache[] }) => {
    const savedResults = data.savedResults || [];
    savedResults.push({ hash: promptHash, model, tokens });
    chrome.storage.sync.set({ savedResults });
  });
}
// Async worker for API call
async function processDiacritizationBatches(method: string, cache: ProcessorResponse[], diacritizationBatches: { text: string; elements: TextElement[] }[]): Promise<ProcessorResponse[]> {
  const texts = diacritizationBatches.map((batch) => batch.text);
  let diacritizedTextArray: string[] = [];
  if (method === 'diacritize') {
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
  return diacritizationBatches.map((batch, index) => {
    const diacritizedTexts = diacritizedTextArray[index].split(delimiter);
    return { elements: batch.elements, diacritizedTexts, rawResult: diacritizedTextArray[index]};
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