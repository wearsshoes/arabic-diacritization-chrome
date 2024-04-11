import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './prompt.json';
import Bottleneck from 'bottleneck'
import { MessageCreateParams } from '@anthropic-ai/sdk/resources/beta/tools/messages';

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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

// Async worker for API call
async function processTranslationBatches(method: string, cache: processorResponse[], translationBatches: { text: string; elements: TextElement[] }[]): Promise<processorResponse[]> {
  const texts = translationBatches.map((batch) => batch.text);
  let translatedTextArray: string[] = [];
  if (method === 'diacritize') {
    console.log('Received diacritization request and data, processing');
    const diacritizeArray = await diacritizeTexts(texts);
    translatedTextArray = diacritizeArray
  } else if (method === 'arabizi') {
    console.log('Received arabizi request and data, processing');
    if (cache.length) {
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