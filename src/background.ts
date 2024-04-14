import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './defaultPrompts.json';
import { calculateHash, getAPIKey } from './utils';  
import { Prompt, TransliterationDict, ProcessorResponse, TextElement } from './types';
import { defaultModel, anthropicAPICall, countSysPromptTokens, escalateModel } from './anthropicCaller'

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
  if (request.action === "getSystemPromptLength") {
    const prompt = request.prompt;
    countSysPromptTokens(prompt).then((tokens) => sendResponse(tokens));
    return true;
  }
  if (request.action === "translate" && request.data) {
    // Process the translation batches received from the content script
    processTranslationBatches(request.method, request.cache, request.data)
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

// ----------------- Functions ----------------- //

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
async function processTranslationBatches(method: string, cache: ProcessorResponse[], translationBatches: { text: string; elements: TextElement[] }[]): Promise<ProcessorResponse[]> {
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

// Arabizi transliteration
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

// ALLCAPS translation function <for fun>
function ALLCAPS(str: string): string {
  return str.replace(/[a-z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    return String.fromCharCode(charCode - 32);
  });
}