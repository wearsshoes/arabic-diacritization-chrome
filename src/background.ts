import Anthropic from '@anthropic-ai/sdk';
import arabizi from './arabizi.json';
import prompts from './prompt.json';
import Bottleneck from 'bottleneck'

const delimiter = '|'

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
  minTime: 1200
});

async function anthropicAPICall(params: any): Promise<any> {
  const apiKey = await getApiKey();
  const anthropic = new Anthropic({ apiKey: apiKey });
  console.log('Queued a job with parameters:', params); 
  return anthropicLimiter.schedule(async () => {
    try {
      console.log('Sent a job with parameters:', params);
      const result = await anthropic.messages.create(params);
      return result;
    }catch{  
      throw new Error("Failed to make API call");
    }
  });
}

// Check number of system prompt tokens
async function sysPromptTokens(prompt: string): Promise<number> {
  const msg = await anthropicAPICall({
    model: "claude-3-haiku-20240307",
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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate" && request.data) {
    // Process the translation batches received from the content script
    processTranslationBatches(request.data)
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
async function processTranslationBatches(translationBatches: { text: string; elements: TextElement[] }[]): Promise<{ elements: TextElement[]; translatedTexts: string[] }[]> {
  const texts = translationBatches.map((batch) => batch.text);
  const translatedTextArrays = await diacritizeTexts(texts);

  return translationBatches.map((batch, index) => {
    const translatedTexts = translatedTextArrays[index].split(delimiter);
    return { elements: batch.elements, translatedTexts };
  });
}

// API Call for Diacritization
async function diacritizeTexts(texts: string[]): Promise<string[]> {
  const prompt = prompts.p3;
  console.log('Diacritizing', texts.length, 'texts', texts);

  const sysPromptLength = await sysPromptTokens(prompt);
  console.log('System prompt length:', sysPromptLength);

  const diacritizedTexts = await Promise.all(texts.map(async (arabicText) => {
    try {
      
      const msg = await anthropicAPICall({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0,
        system: prompt,
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
      let diacritizedText = msg.content[0].text;

      let inputTokens = msg.usage.input_tokens - sysPromptLength;
      let outputTokens = msg.usage.output_tokens;
      console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);

      const separatorsInOriginal = arabicText.split(delimiter).length - 1;
      const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
      
      const maxRetries = 0
      let retries = 0

      while (retries <= maxRetries && (inputTokens > outputTokens || separatorsInDiacritized != separatorsInOriginal)) {
        console.log(arabicText);
        console.log(diacritizedText);
        console.log('Too short or wrong separators, trying again: try', retries + 1, 'of', maxRetries);
        const newMsg = await anthropicAPICall({
          model: "claude-3-sonnet-20240229",
          max_tokens: 4000,
          temperature: 0, 
          system: prompt,
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
        inputTokens = newMsg.usage.input_tokens;
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
      return arabicText;
    }
  }));

  console.log('Finished diacritizing.')
  return diacritizedTexts;
}

/*-----------------------------------*/

// **DUMMY** API Call for Translation
// function translateTexts(texts: string[]): Promise<string[]> {
//   return new Promise((resolve) => {
//     // Simulate a delay for the API call
//     setTimeout(() => {
//       const translatedTexts = texts.map(text => arabicToArabizi(text, arabizi.transliteration));
//        resolve(translatedTexts);
//     }, 1000);
//   });
// }

// // ALLCAPS translation function
// function ALLCAPS(str: string): string {
//   return str.replace(/[a-z]/g, (char) => {
//     const charCode = char.charCodeAt(0);
//     return String.fromCharCode(charCode - 32);
//   });
// }

// // Arabizi translation function
// interface TransliterationDict {
//   [key: string]: string[];
// }

// function arabicToArabizi(arabicText: string, transliterationDict: TransliterationDict): string {
//   let arabiziText = '';

//   for (let i = 0; i < arabicText.length; i++) {
//     const char = arabicText[i];
//     const transliterations = transliterationDict[char];

//     if (transliterations) {
//       arabiziText += transliterations[0]; // Use the first transliteration by default
//     } else {
//       arabiziText += char; // If no transliteration found, keep the original character
//     }
//   }

//   return arabiziText;
// }