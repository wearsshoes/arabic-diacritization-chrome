import Anthropic from "@anthropic-ai/sdk";
import { Diacritizations, PageMetadata, TextNode, WebPageDiacritizationData } from '../common/dataClass';
import { Claude, defaultModel, countSysPromptTokens, anthropicAPICall } from "./anthropicCaller";
import { arabicToArabizi } from "./arabizi";
import { tab, messageContentScript, dataManager } from './background';
import { getAPIKey } from "./datamanager";
import { Prompt } from '../common/types'
import prompts from './defaultPrompts.json';
import { sentenceRegex } from '../common/utils';
import { m } from "framer-motion";

const delimiter = '|';
export const defaultPrompt: Prompt = prompts[1];
const promptText = defaultPrompt.text;

export async function getPrompt(): Promise<Prompt> {
  try {
    const { selectedPrompt } = await chrome.storage.sync.get('selectedPrompt');
    return selectedPrompt;
  } catch (error) {
    console.error(`Error retrieving prompt: ${error}, using default prompt.`);
    return defaultPrompt;
  }
}

export async function processSelectedText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics'): Promise<void> {
  if (!tab.id) return;
  const request = await messageContentScript(tab.id, { action: "getSelectedNodes" });
  const { selectedNodes } : { selectedNodes: TextNode[] } = request;
  console.log("Doing ", method, "for selected nodes:", selectedNodes);
  const replacementText = await fullDiacritization(defaultPrompt, selectedNodes, tab.id);
  console.log('Diacritization result:', replacementText);
  if (method === 'arabizi') {
    replacementText.forEach((node) => {
      node.text = arabicToArabizi([node.text])[0];
    });
  }
  await messageContentScript(tab.id, { action: 'updateWebsiteText', originals: selectedNodes, replacements: replacementText, method });
}

export async function processFullWebpage(method: string) {

  const response = await messageContentScript(tab.id, { action: 'getWebsiteMetadata' });
  const { pageMetadata }: { pageMetadata: PageMetadata } = response;
  const webPageDiacritizationData = await WebPageDiacritizationData.build(pageMetadata);
  console.log('Website metadata:', pageMetadata);

  // Load the saved data for the current webpage
  const retrievedPageData = await dataManager.getWebPageData(tab.url);
  console.log('Retrieved page data:', retrievedPageData);

  const requestMatchesSaved = function (): boolean {
    // If there's no saved data, continue
    if (!retrievedPageData) {
      console.log("There's no saved webpage data, continuing");
      return false;
    }

    // If saved data is available but has changed, ignore old data, continue
    const oldSig = retrievedPageData.metadata.contentSignature
    const currentSig = pageMetadata.contentSignature
    if (oldSig !== currentSig) {
      console.log('Content has changed, will regenerate diacritization and discard all old ones. Current hash:', currentSig, 'Saved hash:', oldSig);
      return false;
      // TODO: only update the elements that have changed
      // logChanges(retrievedPageData.metadata, pageMetadata);
    }

    // If saved data doesn't contain the requested diacritization method, retrieve all other saved diacritizations, continue
    if (!Object.hasOwn(retrievedPageData.diacritizations, method)) {
      console.log('Webpage is unchanged, generating', method, 'from saved data:', retrievedPageData.diacritizations);
      webPageDiacritizationData.diacritizations = retrievedPageData.diacritizations;
      return false;
    }

    // If saved data contains the requested method, update the website text with the saved data, stop
    const original = retrievedPageData.getDiacritization('original');
    const diacritization = retrievedPageData.getDiacritization(method);
    messageContentScript(tab.id, { action: 'updateWebsiteText', originals: original, replacements: diacritization, method })
      .then((response) => {
        console.log(`Website text updated with saved ${method} data, result: ${response.result}`);
        return true;
      })
      .catch((error) => {
        console.error('Failed to update website text with saved data:', error);
      })
    return false;
  };

  // Stop here if we've already processed the request.
  if (requestMatchesSaved()) {
    return ({ result: 'success' });
  }

  // Get the website text
  if (!webPageDiacritizationData.diacritizations['original']) {
    const response = await messageContentScript(tab.id, { action: 'getWebsiteText' });
    const { websiteText } = response;
    console.log('Retrieved original website text:', websiteText);
    await webPageDiacritizationData.createOriginal(websiteText);
  }

  // Process the webpage
  webPageDiacritizationData.diacritizations = await processWebpage(method, webPageDiacritizationData, tab.id);

  // TODO: this happens before the diacritization is finished, so the website text is not updated
  // Update the saved metadata
  console.log('Updating saved web page data');
  dataManager.updateWebPageData(tab.url, webPageDiacritizationData)
    .then(() => console.log('Saved webpage data updated:', webPageDiacritizationData))
    .catch((error) => console.error('Failed to update saved webpage data:', error));

  // Update the website text
  const original = webPageDiacritizationData.getDiacritization('original');
  const diacritization = webPageDiacritizationData.getDiacritization(method);
  messageContentScript(tab.id, { action: 'updateWebsiteText', originals: original, replacements: diacritization, method })
    .then(() => console.log('Website text updated'));

  return ({ result: 'success' });

}

// processWebpage is called by processFullWebpage
export async function processWebpage(method: string, data: WebPageDiacritizationData, tabId: number): Promise<Diacritizations> {

  switch (method) {
    // If the method is 'fullDiacritics' and saved data exists for the current webpage, return the saved results
    case 'fullDiacritics':
      await fullDiacritization(defaultPrompt, data.getDiacritization('original'), tabId)
        .then((fullDiacritics) => {
          data.addDiacritization(fullDiacritics, method);
        });
      break;

    case 'arabizi':
      if (!data.diacritizations['fullDiacritics']) {
        console.log("Full diacritization doesn't exist, Diacritizing text first");
        await fullDiacritization(defaultPrompt, data.getDiacritization('original'), tabId)
          .then((fullDiacritics) => {
            data.addDiacritization(fullDiacritics, 'fullDiacritics');
          });
      }

      const arabiziNodes: TextNode[] = data.getDiacritization('fullDiacritics').map((node) => ({
        ...node,
        text: arabicToArabizi([node.text])[0],
      }));
      data.addDiacritization(arabiziNodes, method);
      break;

    default:
      throw new Error(method + ' is not implemented yet');
  }
  return data.diacritizations;
};

// Full diacritization
export async function fullDiacritization(prompt: Prompt, websiteText: TextNode[], tabId: number): Promise<TextNode[]> {
  const diacritizationBatches = createDiacritizationElementBatches(websiteText, 750);
  const texts = createAPIBatches(diacritizationBatches);
  const resultBatches = await diacritizeTexts(prompt, texts, diacritizationBatches, tabId);
  console.log('resultBatches:', resultBatches);
  const result = resultBatches.flatMap((batch) => batch.split(delimiter));
  const diacritizedNodes: TextNode[] = websiteText.map((node, index) => {
    return {
      ...node,
      text: result[index]
    };
  });
  console.log('Diacritized text:', diacritizedNodes);
  return diacritizedNodes;
}

// Create batches of elements according to sentence boundaries and API character limit.
function createDiacritizationElementBatches(textElements: TextNode[], maxChars: number): TextNode[][] {
  console.log('starting batching on', textElements.length, 'elements');
  const textElementBatches: TextNode[][] = [];
  let currentBatch: TextNode[] = [];
  let currentBatchLength = 0;
  let batchLengths: [number, string, TextNode[]][] = [];

  textElements.forEach((textElement, index) => {
    const text = textElement.text;
    if (text != '') {
      // Check whether there are any Arabic characters. Not used
      // function containsArabicCharacters(text: string): boolean {
      //   const arabicRegex = /[\u0600-\u06FF]/;
      //   return arabicRegex.test(text);
      // }
      // if (containsArabicCharacters(text)) {
      // we want to take these out, but doing so might cause us to lose context within sentences.
      // once we have better batch management with sentences paragraphs etc, we can then address this.
      const textLength = text.length;

      if ((currentBatchLength + textLength) > maxChars) {
        if (currentBatch.length > 0) {
          batchLengths.push([currentBatchLength, 'maxChars', currentBatch]);
          textElementBatches.push(currentBatch);
        }
        currentBatch = [textElement];
        currentBatchLength = textLength;
      } else {
        currentBatch.push(textElement);
        currentBatchLength += textLength;

        // handle sentence breaks as new batch        
        if ((text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))) || index === (textElements.length - 1)) {
          batchLengths.push([currentBatchLength, 'end of sentence', currentBatch]);
          textElementBatches.push(currentBatch);
          currentBatch = [];
          currentBatchLength = 0;
        }
      }
    }
  });
  console.log("batches created:", textElementBatches.length);
  console.log(batchLengths);

  return textElementBatches;
}

// Prepare batches for API by extracting the text with delimiters.
function createAPIBatches(textElementBatches: TextNode[][]): string[] {
  const diacritizationBatches: string[] = [];
  textElementBatches.forEach((batch) => {
    const batchText = batch.map((textElement) => textElement.text.replace(delimiter, ''))
      .join(delimiter);
    diacritizationBatches.push(batchText);
  });
  return diacritizationBatches;
}

// API Call for Diacritization
export async function diacritizeTexts(prompt: Prompt, texts: string[], textElementBatches: TextNode[][], tabId: number): Promise<string[]> {
  const apiKey = await getAPIKey();
  const claude = new Claude(defaultModel, apiKey);
  const sysPromptLength = await countSysPromptTokens(promptText) || 0;

  // for the overlay
  messageContentScript(tabId, { action: 'diacritizationBatchesStarted', batches: texts.length });

  // parameters for retrying
  const fudgefactor = 1;
  const maxTries = 1;

  // diacritize the texts in parallel with retries
  const diacritizedTexts = await Promise.all(
    texts.map(async (arabicTextChunk, index) => {
      for (let tries = 0; tries < maxTries; tries++) {
        claude.escalateModel();
        try {
          const response = await callAnthropicAPI(
            arabicTextChunk,
            prompt,
            claude
          );

          const diacritizedText: string = response.content[0].text;
          console.log(arabicTextChunk);
          console.log(diacritizedText);

          // check the token output: should be more than the input
          const inputTokens = response.usage.input_tokens - sysPromptLength;
          const outputTokens = response.usage.output_tokens;
          console.log('Input tokens:', inputTokens, 'Output tokens:', outputTokens);
          const enoughTokens = outputTokens > inputTokens;

          // check if the diacritized text is longer than the original text
          const separatorsInOriginal = arabicTextChunk.split(delimiter).length - 1;
          const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
          console.log('Separators in original:', separatorsInOriginal, 'Separators in diacritized:', separatorsInDiacritized);
          const rightDelimiters = separatorsInDiacritized + fudgefactor >= separatorsInOriginal;

          if (enoughTokens && rightDelimiters) {
            
            const originals: TextNode[] = textElementBatches[index];
            const replacements: TextNode[] = diacritizedText.split(delimiter).map((text, index) => ({
              ...originals[index],
              text: text
            }));
            messageContentScript(tabId, {
              action: 'diacritizationChunkFinished',
              originals,
              replacements,
              method: 'fullDiacritics'
            });
            return diacritizedText;

          } else {
            console.log('Too short or wrong separators, trying again: try', tries, 'of', maxTries);
          }
        } catch (error) {
          console.error('Error diacritizing chunk:', error);
          break;
        }
      }
      return arabicTextChunk;
    })
  );
  console.log('Finished diacritizing.');
  return diacritizedTexts;
}

// Function to construct the message and make the API call
export async function callAnthropicAPI(
  arabicTextChunk: string,
  prompt: Prompt,
  claude: Claude,

): Promise<Anthropic.Message> {
  const msg: Anthropic.Messages.MessageCreateParams = {
    model: claude.model.currentVersion,
    max_tokens: 4000,
    temperature: 0,
    system: prompt.text,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: arabicTextChunk,
          }
        ]
      }
    ]
  };

  const response: Anthropic.Message = await anthropicAPICall(msg, claude.apiKey);
  return response;
}

// export function logChanges(saved: PageMetadata, current: PageMetadata): void {
//   const currentStructure = current.structuralMetadata;
//   const savedStructure = saved.structuralMetadata;

//   const diff: Record<string, { current: unknown; saved: unknown; }> = {};

//   Object.keys(currentStructure).forEach((key: string) => {
//     if (!isEqual(currentStructure[key], savedStructure[key])) {
//       diff[key] = {
//         current: currentStructure[key],
//         saved: savedStructure[key],
//       };
//     }
//   });

//   if (Object.keys(diff).length > 0) {
//     console.log('Differences:');
//     console.log(JSON.stringify(diff, null, 2));
//   } else {
//     console.log('No differences found.');
//   }
// }

// function isEqual(a: unknown, b: unknown): boolean {
//   if (typeof a !== typeof b) {
//     return false;
//   }

//   if (typeof a === 'object' && a !== null && b !== null) {
//     const keysA = Object.keys(a as Record<string, unknown>);
//     const keysB = Object.keys(b as Record<string, unknown>);

//     if (keysA.length !== keysB.length) {
//       return false;
//     }

//     for (const key of keysA) {
//       if (!isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
//         return false;
//       }
//     }

//     return true;
//   }

//   return a === b;
// }