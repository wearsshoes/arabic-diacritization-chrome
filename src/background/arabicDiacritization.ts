import Anthropic from "@anthropic-ai/sdk";
import { TextNode } from '../common/webpageDataClass';
import { Claude, countSysPromptTokens, anthropicAPICall, constructAnthropicMessage } from "./anthropicCaller";
import { messageContentScript } from './background';
import { sentenceRegex } from '../common/utils';
import { Prompt } from '../common/types'
import prompts from './defaultPrompts.json';
import { EventEmitter } from 'events';

const defaultPrompt = prompts[1];

async function getPrompt(): Promise<Prompt> {
  try {
    const { selectedPrompt } = await chrome.storage.sync.get('selectedPrompt');
    return selectedPrompt;
  } catch (error) {
    console.error(`Error retrieving prompt: ${error}, using default prompt.`);
    return defaultPrompt;
  }
}

// Full diacritization
export async function fullDiacritization(tabId: number, tabUrl: string, selectedNodes: TextNode[], abortSignal: AbortSignal): Promise<TextNode[]> {

  const diacritizationBatches = createDiacritizationElementBatches(selectedNodes, 750);
  const prompt = await getPrompt();
  const claude = new Claude()
  const sysPromptLength = await countSysPromptTokens(prompt.text) || 0;
  const maxTries = 1;
  const delimiter = '|';
  let validationFailures = 0;

  messageContentScript(tabId, { action: 'diacritizationBatchesStarted', tabUrl: tabUrl, batches: diacritizationBatches.length });

  // diacritize the texts in parallel with retries
  const diacritizedNodes = await Promise.all(

    diacritizationBatches.map(async (originals) => {
      const originalText = originals.flatMap((textNode) => textNode.text.replace(delimiter, '')).join(delimiter);

      const eventEmitter = new EventEmitter();
      const msg = constructAnthropicMessage(originalText, prompt, claude);

      for (let tries = 0; tries < maxTries; tries++) {
        claude.escalateModel();
        let diacritizedAccumulated = '';

        eventEmitter.on('text', (textDelta) => {
          diacritizedAccumulated += textDelta;

          let delimiterIndex;
          while ((delimiterIndex = diacritizedAccumulated.indexOf(delimiter)) !== -1) {
            const sentencesToCheck = originals
            const extractedText = diacritizedAccumulated.slice(0, delimiterIndex);
            const strippedText = stripDiacritics(extractedText);
            const textNode = sentencesToCheck.shift();
            const oldText = stripDiacritics(textNode?.text || '');

            console.log('Extracted text:', extractedText)
            console.log('Stripped text:', strippedText)
            console.log('Original text:', oldText);
            if (strippedText === oldText && textNode) {
              console.log('Sentence validation passed for extracted text:', extractedText);
              const replacements: TextNode[] = [{ ...textNode, text: extractedText }]
              messageContentScript(tabId, {action: 'updateWebsiteText', replacements, method: 'fullDiacritics', tabUrl: tabUrl})
            } else {
              console.error('Sentence validation failed for extracted text:', extractedText);
              // Handle the validation failure based on your error handling strategy
              validationFailures++;
            }

            diacritizedAccumulated = diacritizedAccumulated.slice(delimiterIndex + 1);
          }
        });

        try {
          const response = await anthropicAPICall(msg, claude.apiKey, abortSignal, eventEmitter);
          const diacritizedText: string = response.content[0].text;
          console.log('originals: ', originalText, 'diacritized: ', diacritizedText);

          const validResponse = validateResponse(response, originalText, diacritizedText);
          if (validResponse) {
            const replacements: TextNode[] = diacritizedText.split(delimiter).map((text, index) => ({ ...originals[index], text }));
            messageContentScript(tabId, { action: 'diacritizationChunkFinished', tabUrl: tabUrl, originals, replacements, method: 'fullDiacritics' });
            return replacements;
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          throw new Error(`Failed to diacritize chunk: ${error}`);
        }
        if (tries < maxTries - 1) {
          console.log('Failed validation. trying again: try', tries + 1, 'of', maxTries);
        }
      }
      console.error('Failed to diacritize chunk, returning original text');
      return originals;
    })
  ).then((result) => { return result.flat() });

  console.log('Diacritized text:', diacritizedNodes, 'Validation failures:', validationFailures);
  return diacritizedNodes;

  function stripDiacritics(text: string): string {
    return text.trim().normalize('NFC').replace(/([\u064B-\u0652])/g, '')
  }

  function validateResponse(response: Anthropic.Messages.Message, originalText: string, diacritizedText: string): boolean {
    const { input_tokens, output_tokens } = response.usage;
    console.log('Input tokens:', input_tokens - sysPromptLength, 'Output tokens:', output_tokens);
    const enoughTokens = output_tokens > (input_tokens - sysPromptLength);

    // check if the diacritized text is longer than the original text
    const separatorsInOriginal = originalText.split(delimiter).length - 1;
    const separatorsInDiacritized = diacritizedText.split(delimiter).length - 1;
    console.log('Separators in original:', separatorsInOriginal, 'Separators in diacritized:', separatorsInDiacritized);
    const rightDelimiters = (separatorsInDiacritized - separatorsInOriginal === 0);
    return (enoughTokens && rightDelimiters);
  }
}

// Create batches of elements according to sentence boundaries and API character limit.
function createDiacritizationElementBatches(textElements: TextNode[], maxChars: number): TextNode[][] {
  console.log('starting batching on', textElements.length, 'elements');
  const textElementBatches: TextNode[][] = [];
  let currentBatch: TextNode[] = [];
  let currentBatchLength = 0;
  const batchStats: [number, string, TextNode[]][] = [];

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
          batchStats.push([currentBatchLength, 'maxChars', currentBatch]);
          textElementBatches.push(currentBatch);
        }
        currentBatch = [textElement];
        currentBatchLength = textLength;
      } else {
        currentBatch.push(textElement);
        currentBatchLength += textLength;

        // handle sentence breaks as new batch
        if ((text.match(sentenceRegex) && (currentBatchLength > (maxChars * 2 / 3))) || index === (textElements.length - 1)) {
          batchStats.push([currentBatchLength, 'end of sentence', currentBatch]);
          textElementBatches.push(currentBatch);
          currentBatch = [];
          currentBatchLength = 0;
        }
      }
    }
  });
  console.log(`batches created: ${textElementBatches.length}`, batchStats);

  return textElementBatches;
}

