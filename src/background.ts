import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "my_api_key", // defaults to process.env["ANTHROPIC_API_KEY"]
});

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