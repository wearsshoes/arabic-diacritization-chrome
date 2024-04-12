import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './prompt.json';
import Bottleneck from 'bottleneck'
import { MessageCreateParams } from '@anthropic-ai/sdk/resources/beta/tools/messages';
import { prototype } from 'copy-webpack-plugin';

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
      console.log("ArabEasy successfully installed! Thank you for using this app.");
  }else if(details.reason == "update"){
      var thisVersion = chrome.runtime.getManifest().version;
      console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
  }
});

let apiKeyExists: boolean = true;

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

// Waits for popup to connect and sends a message to it

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup" && apiKeyExists === false) {
    chrome.runtime.sendMessage({ action: "promptForAPIKey" }, (response) => {
      if (response === "success") {
        console.log("API Key needed");
      }
    });
  };
});

const delimiter = '|'

const claude: Record<string, string> = {
  haiku: "claude-3-haiku-20240307",
  sonnet: "claude-3-sonnet-20240229",
  opus: "claude-3-opus-20240229"
}

const diacritizePrompt = prompts.p4;

interface TransliterationDict {
  [key: string]: string[];
}


// Get API Key 
async function getApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
      chrome.storage.sync.get('apiKey', function(result) {
          if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
          } else {
              resolve(result.apiKey);
          }
      });
  });
}

// Rate-limited Anthropic API call function
const anthropicLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 1500
});

async function anthropicAPICall(params: Anthropic.MessageCreateParams): Promise<any> {
  const apiKey = await getApiKey();
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
    model: claude.sonnet,
    max_tokens: 1,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: diacritizePrompt
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

  const sysPromptLength = await sysPromptTokens(diacritizePrompt);
  console.log('System prompt length:', sysPromptLength);

  let diacritizedText:string;

  const diacritizedTexts = await Promise.all(texts.map(async (arabicText) => {
    try {
      
      const msg = await anthropicAPICall({
        model: claude.sonnet,
        max_tokens: 4000,
        temperature: 0,
        system: diacritizePrompt,
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
      });

      console.log('output from', msg)
      diacritizedText = msg.content[0].text;

      let inputTokens = msg.usage.input_tokens - sysPromptLength;
      let outputTokens = msg.usage.output_tokens;
      console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);

      const separatorsInOriginal = arabicText.split(delimiter).length - 1;
      const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
      
      const maxRetries = 0
      let retries = 0
      let fudgefactor = 1

      while (retries <= maxRetries && (inputTokens > outputTokens || (separatorsInDiacritized + fudgefactor < separatorsInOriginal))) {
        if (retries === maxRetries) {
          throw new Error('max retries exceeded')
        }
        console.log(arabicText);
        console.log(diacritizedText);
        console.log('Too short or wrong separators, trying again: try', retries + 1, 'of', maxRetries);
        const newMsg = await anthropicAPICall({
          model: claude.sonnet,
          max_tokens: 4000,
          temperature: 0, 
          system: diacritizePrompt,
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
        });
        inputTokens = newMsg.usage.input_tokens - sysPromptLength;
        outputTokens = newMsg.usage.output_tokens;
        console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
        diacritizedText = newMsg.content[0].text;
        retries++;
      }

      console.log(arabicText);
      console.log(diacritizedText);

      return diacritizedText;
    } catch (error) {
        console.error('Error diacritizing chunk:', error);
        console.log(arabicText);
        console.log(diacritizedText);
      return arabicText;
    }
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

// ALLCAPS translation function
function ALLCAPS(str: string): string {
  return str.replace(/[a-z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    return String.fromCharCode(charCode - 32);
  });
}

const main = async () => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    apiKeyExists = false;
    console.log('No API key found');
  } else {
    console.log('API key found');
  }
}

main();