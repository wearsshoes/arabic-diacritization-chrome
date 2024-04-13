import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './defaultPrompts.json';
import Bottleneck from 'bottleneck'

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate" && message.data) {
    // Process the translation batches received from the content script
    processTranslationBatches(message.method, message.cache, message.data)
      .then(translatedBatches => {
        sendResponse({type: 'translationResult', data: translatedBatches});
      })
      .catch(error => {
        console.error('Error processing translation batches:', error);
        sendResponse({type: 'error', message: 'Failed to process translation batches'});
      });
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});

// Waits for popup to connect and sends a message to it to prompt for API key if it doesn't exist
// not implemented

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup" && apiKeyExists === false) {
    chrome.runtime.sendMessage({ action: "promptForAPIKey" }, (response) => {
      if (response === "success") {
        console.log("Attempting to prompt for API key.");
      }
    });
  };
});

// Get API Key 
async function getAPIKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey'], (data: { apiKey?: string }) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const apiKey: string = data.apiKey || '';
        resolve(apiKey);
      }
    });
  });
}


interface Models {
  [key: string]: Model;
}

interface Model {
  currentVersion: string;
  level: number;
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

interface Prompt {
  name: string;
  text: string;
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

async function anthropicAPICall(params: Anthropic.MessageCreateParams, key?: string): Promise<any> {
  
  //probably shouldn't call this every time... but it's fine for now
  // option to pass in a key to avoid this call
  const apiKey = key || await getAPIKey();

  const anthropic = new Anthropic({ apiKey: apiKey });
  console.log('Queued a job with parameters:', params); 
  return anthropicLimiter.schedule(async () => {
    try {
      console.log('Sent a job with parameters:', params);
      const result = await anthropic.messages.create(params);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  });
}

// Check number of system prompt tokens
async function sysPromptTokens(prompt: string): Promise<number> {
  const msg = await anthropicAPICall({
    model: claude.haiku.currentVersion,
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
  return msg.usage.input_tokens;
}

// Async worker for API call
async function processTranslationBatches(method: string, cache: processorResponse[], translationBatches: { text: string; elements: TextElement[] }[]): Promise<processorResponse[]> {
  const texts = translationBatches.map((batch) => batch.text);
  let translatedTextArray: string[] = [];
  if (method === 'diacritize') {
    // could be fun to have claude run with figuring out the dialect, and then feeding that as an argument to the prompt
    // partial diacritization... just build out a lot of options...
    console.log('Received diacritization request and data, processing');
    const diacritizeArray = await diacritizeTexts(texts);
    translatedTextArray = diacritizeArray
  } else if (method === 'arabizi') {
  // honestly, this could just be generated automatically and toggled on/off back to full arabic cache state
  // could also be fun to do a "wubi" version on alternating lines?
    console.log('Received arabizi request and data, processing');
    console.log(cache);
    if (cache && cache.length) {
      console.log('Diacritization inferred to exist, transliterating')
      translatedTextArray = arabicToArabizi(cache.map((batch) => batch.rawResult));
    } else {
      console.log('Diacritizing text first')
      const diacritizeArray = await diacritizeTexts(texts);
      translatedTextArray = arabicToArabizi(diacritizeArray)
    }
  }
  return translationBatches.map((batch, index) => {
    const translatedTexts = translatedTextArray[index].split(delimiter);
    return { elements: batch.elements, translatedTexts, rawResult: translatedTextArray[index]};
  });
}

// API Call for Diacritization
async function diacritizeTexts(texts: string[]): Promise<string[]> {
  console.log('Diacritizing', texts.length, 'texts', texts);
  
  const fudgefactor = 1
  const maxTries = 1
  let tries = 0
  
  const apiKey = await getAPIKey() || '';
  
  const diacritizePrompt = await getPrompt() || defaultPrompt;
  const promptText = diacritizePrompt.text;
  
  const sysPromptLength = await sysPromptTokens(promptText) || 0;
  console.log('System prompt length:', sysPromptLength);

  const diacritizedTexts = await Promise.all(texts.map(async (arabicText) => {
    while (tries >= 0 && tries < maxTries) {
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
      }
      try {
        const response = await anthropicAPICall(msg, apiKey);
        console.log(response.id);

        const inputTokens = response.usage.input_tokens - sysPromptLength;
        const outputTokens = response.usage.output_tokens;
        console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
        
        const diacritizedText: string = response.content[0].text;
        console.log(arabicText);
        console.log(diacritizedText);
        
        const separatorsInOriginal = arabicText.split(delimiter).length - 1;
        const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
        if (inputTokens >= outputTokens && separatorsInDiacritized + fudgefactor >= separatorsInOriginal) {
          return diacritizedText;
        } else {
          console.log('Too short or wrong separators, trying again: try', tries, 'of', maxTries);
          tries++;
        }
      } catch (error) {
        console.error('Error diacritizing chunk:', error);
        break;
      }
    }
    console.error('Failed to diacritize text.');
    return arabicText;
  }));
  console.log('Finished diacritizing.')
  return diacritizedTexts;
}

// Arabizi transliteration
// still need to do a lot of things: sun/moon transformation
// fii instead of fiy, etc
// man, maybe there's even different pronunciation choices for dialects...? too much to consider...
// simple one: get the punctuation marks to change to english equivs

interface TransliterationDict {
  [key: string]: string[];
}

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

// ALLCAPS translation function <for fun>
function ALLCAPS(str: string): string {
  return str.replace(/[a-z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    return String.fromCharCode(charCode - 32);
  });
}

let apiKeyExists = false;

// Main function
const main = async () => {
  // Check if API key exists
  const apiKey = await getAPIKey();
  if (apiKey) {
    apiKeyExists = true;
    console.log('API Key found:', apiKey);
  } else {
    apiKeyExists = false;
    console.log('API Key not found.');
  }
}

main();