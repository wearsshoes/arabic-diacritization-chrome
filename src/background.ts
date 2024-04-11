import Anthropic from "@anthropic-ai/sdk";
import arabizi from './arabizi.json';
import prompts from './prompt.json';

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
    const translatedTexts = translatedTextArrays[index].split('|');
    return { elements: batch.elements, translatedTexts };
  });
}

// API Call for Diacritization
async function diacritizeTexts(texts: string[]): Promise<string[]> {
  const apiKey = await getApiKey();
  const anthropic = new Anthropic({
    apiKey: apiKey
  });
  const prompt = prompts.p2
  console.log('Diacritizing', texts.length, 'texts', texts);

  const diacritizedTexts = await Promise.all(texts.map(async (arabicText) => {
    try {
      // console.log('Diacritizing', arabicText);
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0,
        system: prompt,
        messages: [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": arabicText,
              }
            ]
          }
        ]
      });
      
      let diacritizedText = msg.content[0].text;
      console.log('Input tokens:', msg.usage.input_tokens, 'Output tokens;', msg.usage.output_tokens);
      
      if (msg.usage.input_tokens > msg.usage.output_tokens) {
        console.log('Too short, trying again')
        const newMsg = await anthropic.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 4000,
          temperature: 0,
          system: prompt,
          messages: [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": arabicText,
                }
              ]
            }
          ]
        }); 
        console.log('Input tokens:', newMsg.usage.input_tokens, 'Output tokens;', newMsg.usage.output_tokens);
        diacritizedText = newMsg.content[0].text;
      }

      console.log(arabicText);
      console.log(diacritizedText);

      return diacritizedText;

    } 
    catch (error) {
      console.error('Error diacritizing chunk:', error);
      return arabicText;
    }
  }));

  return diacritizedTexts;
}

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