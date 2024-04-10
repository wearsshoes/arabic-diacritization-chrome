import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "my_api_key", // defaults to process.env["ANTHROPIC_API_KEY"]
});

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
  const translationPromises = translationBatches.map(async (batch) => {
    const translatedTextArray = await translateTexts([batch.text]);
    const translatedTexts = translatedTextArray[0].split('\u200B');

    // Log the tagName and textContent of the first element in the batch, if available
    // if (batch.elements.length > 0 && batch.elements[0].element) {
    //   console.log('First element tagName:', batch.elements[0].element.tagName);
    //   console.log('First element textContent:', batch.elements[0].element.textContent);
    // }

    return { elements: batch.elements, translatedTexts };
  });

  return Promise.all(translationPromises);
}


// **DUMMY** API Call for Translation
// function translateTexts(texts: string[]): Promise<string[]> {
//   return new Promise((resolve) => {
//     // Simulate a delay for the API call
//     setTimeout(() => {
//       // For simplicity, let's just append " (translated)" to each text
//       const translatedTexts = texts.map(text => text + " (translated)");
//       resolve(translatedTexts);
//     }, 1000);
//   });
// }

// **DUMMY** API Call for Translation
function translateTexts(texts: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    // Simulate a delay for the API call
    setTimeout(() => {
      const translatedTexts = texts.map(text => ALLCAPS(text));
      resolve(translatedTexts);
    }, 10);
  });
}

// ROT13 translation function
function ALLCAPS(str: string): string {
  return str.replace(/[a-z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    return String.fromCharCode(charCode - 32);
  });
}


// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   if (request.action === 'diacritize') {
//     const chunks: string[] = request.chunks;
//     const diacritizedChunks: string[] = [];

//     const diacritizeChunk = async (index: number) => {
//       if (index >= chunks.length) {
//         sendResponse({ diacritizedChunks: diacritizedChunks });
//         return;
//       }

//       const chunk = chunks[index];
//       try {
//         const msg = await anthropic.messages.create({
//           model: "claude-3-haiku-20240307",
//           max_tokens: 2000,
//           temperature: 0,
//           system: "You are an AI assistant that adds full diacritics (taškīl) to Modern Standard Arabic text. Given Arabic text, add all necessary diacritics to fully specify the pronunciation and grammatical function of each word. For example:\n\nOriginal text: ذهب محمد الى المدرسة\nDiacriticized text: ذَهَبَ مُحَمَّدٌ إِلَى الْمَدْرَسَةِ\n\nOnly add the core diacritics (ḥarakāt) used in ordinary Arabic text: fatḥa, kasra, ḍamma, sukūn, šadda, tanwīn. Do not add recitation marks or other diacritics used only in specialized texts like the Quran. Diacriticize the text as it would be pronounced in a neutral, formal MSA accent. \n\nDo not correct grammar. Do not translate non-Arabic words. Preserve punctuation and formatting. Return the full resulting text and nothing else.",
//           messages: [
//             {
//               "role": "user",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": chunk
//                 }
//               ]
//             }
//           ]
//         });

//         const diacritizedChunk = msg.content[-1].text;
//         diacritizedChunks.push(diacritizedChunk);
//         diacritizeChunk(index + 1);
//       } catch (error) {
//         console.error('Error diacritizing chunk:', error);
//         sendResponse({ error: 'Failed to diacritize chunk' });
//       }
//     };

//     diacritizeChunk(0);

//     return true; // Required to use sendResponse asynchronously
//   }
// });