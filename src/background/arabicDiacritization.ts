import { TextNode } from '../common/webpageDataClass';
import { Claude, anthropicAPICall, constructAnthropicMessage } from "./anthropicCaller";
import { messageContentScript } from './background';
import { Prompt } from '../common/types'
import prompts from './defaultPrompts.json';
import { EventEmitter } from 'events';
// import { mainNode } from '../content/content';

const defaultPrompt = prompts[1];

async function getPrompt(): Promise<Prompt> {
  try {
    const { selectedPrompt } = await chrome.storage.sync.get('selectedPrompt');
    return selectedPrompt;
  } catch (error) {
    console.warn(`Error retrieving prompt: ${error}, using default prompt.`);
    return defaultPrompt;
  }
}

// Full diacritization
export async function fullDiacritization(tabId: number, tabUrl: string, selectedNodes: TextNode[], abortSignal: AbortSignal, ruby: boolean = false): Promise<TextNode[]> {

  const diacritizationBatches = createBatches(selectedNodes, 750);
  const prompt = await getPrompt();
  const claude = new Claude()
  const maxTries = 3;
  const delimiter = '|';
  let elementValidationFailures = 0;
  let chunkValidationFailures = 0;

  const strLength = selectedNodes.flatMap((textNode) => textNode.text.split(' ')).length;
  messageContentScript(tabId, { action: 'beginProcessing', tabUrl: tabUrl, strLength });

  // diacritize the texts in parallel with retries
  const diacritizedNodes = await Promise.all(

    diacritizationBatches.map(async (originals) => {
      const originalText = originals.flatMap((textNode) => textNode.text.replace(delimiter, '')).join(delimiter);
      if (originalText.replace(/[^\u0621-\u064A]/g, '') === '') {
        console.warn('Skipping diacritization of totally non-Arabic text');
        return originals;
      }

      const replacements: TextNode[] = [];

      const eventEmitter = new EventEmitter();
      const msg = constructAnthropicMessage(originalText, prompt, claude);

      for (let tries = 1; tries < maxTries; tries++) {
        const sentencesToCheck = [...originals];
        let queue = '';
        let acc = 0;
        let allNodesProcessed = false;

        eventEmitter.on('text', (textDelta) => {
          queue += textDelta;

          while (queue.includes(delimiter) && !allNodesProcessed) {
            if (!sentencesToCheck.length) {
              console.warn('All nodes processed, but not all text received.');
              allNodesProcessed = true;
              return;
            }

            const index = queue.indexOf(delimiter);
            const newText = queue.slice(0, index);
            const textNode = sentencesToCheck.shift()!;
            const validNode: TextNode = { ...textNode, text: newText }

            const checkText = stripDiacritics(newText);
            const refText = stripDiacritics(textNode.text || '');
            const diff = Math.abs(refText.length - checkText.length);
            const fudgeFactor = Math.ceil(refText.length / 50)

            const words = textNode.text.split(' ').length;
            acc += words;

            if (checkText === refText || diff <= fudgeFactor) {
              replacements.push(validNode);
              messageContentScript(tabId, {
                action: 'updateWebsiteText',
                replacements: [validNode],
                tabUrl,
                ruby
              });
            } else {
              console.warn(`Validation failed:\n${newText}\n${checkText}\n${refText}`);
              replacements.push(textNode);
              elementValidationFailures++;
            }

            messageContentScript(tabId, { action: 'updateProgressBar', strLength: words });
            queue = queue.slice(index + 1);
          }
        });

        try {
          const response = await anthropicAPICall(msg, claude.apiKey, abortSignal, eventEmitter);
          eventEmitter?.emit('text', delimiter);
          const diacritizedText: string = response.content[0].text;
          console.log(`Original: \n${originalText} \nResult: \n${diacritizedText}`);

          const validResponse = validateResponse(originalText, diacritizedText);
          if (validResponse) {
            return replacements;
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          throw new Error(`Failed to diacritize chunk: ${error}`);
        }
        messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl, replacements: originals, ruby });
        messageContentScript(tabId, { action: 'updateProgressBar', strLength: -acc });
        chunkValidationFailures++;
        if (tries < maxTries) {
          console.error('Failed validation. trying again: try', tries + 1, 'of', maxTries);
          claude.escalateModel(tries);
        } else {
          console.warn('Failed to diacritize chunk after', maxTries, 'tries,');
        }
      }
      console.warn('Failed to diacritize chunk, returning original text');
      return originals;
    })
  ).then((result) => { return result.flat() });

  console.log('Failed elements:', elementValidationFailures, '\nFailed chunks:', chunkValidationFailures, '\nDiacritized text:', diacritizedNodes);
  return diacritizedNodes;

  function stripDiacritics(text: string): string {
    return text.trim().normalize('NFC').replace(/\s+/g, ' ').replace(/([\u064B-\u0652\u0621-\u0626\u0640])/g, '')
  }

  function validateResponse(originalText: string, diacritizedText: string): boolean {
    const rightDelimiters = originalText.split(delimiter).length - diacritizedText.split(delimiter).length;
    console.log('Difference in delimiters:', Math.abs(rightDelimiters));
    return (rightDelimiters === 0);
  }
}

// Create batches of elements according to sentence boundaries and API character limit.
function createBatches(textNodes: TextNode[], maxChars: number): TextNode[][] {
  const endOfSentence = /[.!?؟]+\s*\n*/g;
  const textBatches: TextNode[][] = [];
  const stats: {length: number, reason: string, batch: TextNode[]}[] = [];
  let currentBatch: TextNode[] = [];
  let acc = 0;

  textNodes.forEach((textNode) => {
    const {text} = textNode;
    if (!text) return;

    if (acc > 0 && (acc + text.length) > maxChars) {
      stats.push({length: acc, reason: 'maxChars', batch: currentBatch});
      textBatches.push(currentBatch);
      currentBatch = [];
      acc = 0;
    }

    currentBatch.push(textNode);
    acc += text.length;

    if (text.match(endOfSentence) && acc > maxChars * 2 / 3) {
      stats.push({length: acc, reason: 'endOfSentence', batch: currentBatch});
      stats
      textBatches.push(currentBatch);
      currentBatch = [];
      acc = 0;
    }

  });

  if (currentBatch.length > 0) {
    stats.push({length: acc, reason: 'endOfText', batch: currentBatch});
    textBatches.push(currentBatch);
  }

  console.log('Created', textBatches.length, 'batches', stats);
  return textBatches;
}

