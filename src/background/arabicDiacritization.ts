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

  const diacritizationBatches = createDiacritizationElementBatches(selectedNodes, 750);
  const prompt = await getPrompt();
  const claude = new Claude()
  const maxTries = 3;
  const delimiter = '|';
  let validationFailures = 0;

  const strLength = selectedNodes.flatMap((textNode) => textNode.text.split(' ')).length;
  messageContentScript(tabId, { action: 'diacritizationBatchesStarted', tabUrl: tabUrl, strLength });
  console.log('Full diacritization, ruby: ', ruby)

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
        let diacritizedAccumulated = '';
        let allNodesProcessed = false;

        eventEmitter.on('text', (textDelta) => {
          diacritizedAccumulated += textDelta;

          let delimiterIndex;
          while ((delimiterIndex = diacritizedAccumulated.indexOf(delimiter)) !== -1 && !allNodesProcessed) {
            const extractedText = diacritizedAccumulated.slice(0, delimiterIndex);
            const strippedText = stripDiacritics(extractedText);
            const sentencesToCheck = originals
            const textNode = sentencesToCheck.shift();
            if (!textNode) {
              console.warn('All text nodes have been processed:', extractedText);
              allNodesProcessed = true;
                  return;
            }

            const refText = stripDiacritics(textNode.text || '');
            const fudgefactor = Math.ceil(refText.length / 50)
            const fudge = Math.abs(refText.length - strippedText.length);
            if (strippedText === refText || fudge <= fudgefactor) {
              // console.log('Validation passed:', extractedText);
              const validNode: TextNode = { ...textNode, text: extractedText }
              replacements.push(validNode);
              messageContentScript(tabId, { action: 'updateWebsiteText', replacements: [validNode], method: 'fullDiacritics', tabUrl: tabUrl, ruby: ruby })
              const words = extractedText.split(' ').length;
              messageContentScript(tabId, { action: 'updateProgressBar', strLength: words })
            } else {
              console.warn(`Validation failed:\n${extractedText}\n${strippedText}\n${refText}`);
              replacements.push(textNode);
              validationFailures++;
            }

            diacritizedAccumulated = diacritizedAccumulated.slice(delimiterIndex + 1);
          }
        });

        try {
          const response = await anthropicAPICall(msg, claude.apiKey, abortSignal, eventEmitter);
          const diacritizedText: string = response.content[0].text;
          console.log('originals:\n', originalText, 'diacritized:\n', diacritizedText);

          const validResponse = validateResponse(originalText, diacritizedText);
          if (validResponse) {
            const lastNode = selectedNodes[selectedNodes.length - 1];
            const lastDiacritizedText = diacritizedText.split(delimiter).pop() || '';
            replacements.push({ ...lastNode, text: lastDiacritizedText })
            messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl: tabUrl, method: 'fullDiacritics', replacements, ruby: ruby });
            messageContentScript(tabId, { action: 'updateProgressBar', strLength: lastDiacritizedText.split(' ').length });
            return replacements;
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          throw new Error(`Failed to diacritize chunk: ${error}`);
        }
        if (tries < maxTries) {
          console.log('Failed validation. trying again: try', tries + 1, 'of', maxTries);
          claude.escalateModel(tries);
        } else {
          console.warn('Failed to diacritize chunk after', maxTries, 'tries,');
        }
      }
      console.warn('Failed to diacritize chunk, returning original text');
      return originals;
    })
  ).then((result) => { return result.flat() });

  console.log('Diacritized text:', diacritizedNodes, 'Validation failures:', validationFailures);
  messageContentScript(tabId, { action: 'allDone' });
  return diacritizedNodes;

  function stripDiacritics(text: string): string {
    return text.trim().normalize('NFC').replace(/\s+/g, ' ').replace(/([\u064B-\u0652\u0621-\u0626\u0640])/g, '')
  }

  function validateResponse(originalText: string, diacritizedText: string): boolean {
    // check if the diacritized text is longer than the original text
    const rightDelimiters = originalText.split(delimiter).length - diacritizedText.split(delimiter).length;
    console.log('Difference in delimiters:', Math.abs(rightDelimiters));
    return (rightDelimiters === 0);
  }
}

// Create batches of elements according to sentence boundaries and API character limit.
function createDiacritizationElementBatches(textNodes: TextNode[], maxChars: number): TextNode[][] {
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

