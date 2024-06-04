import { EventEmitter } from "events";
import { AppResponse } from "../common/types";
import { TextNode, WebpageDiacritizationData } from "../common/webpageDataClass";
import { Claude, anthropicAPICall, constructAnthropicMessage } from "./anthropicCaller";
import { controllerMap, messageContentScript, cancelTask, extensionOptions } from './background';
import { Prompt } from "../common/optionsClass";

export async function processText(tab: chrome.tabs.Tab, method: string = 'fullDiacritics', entirePage: boolean = false): Promise<AppResponse> {
  if (!tab.id || !tab.url) {
    const error = new Error('Tab id or url not found');
    return ({ status: 'error', errorMessage: error.message });
  }
  const { id: tabId, url: tabUrl } = tab;

  try {
    let pageData

    let selectedNodes: TextNode[] = [];

    if (entirePage) {
      ({ pageData } = await buildData(tabId, tabUrl));
      selectedNodes = pageData.getDiacritization('original');
    } else {
      const request = await messageContentScript(tabId, { action: "getSelectedNodes" });
      if (request.status === 'error') throw new Error(request.errorMessage);
      selectedNodes = request.selectedNodes || [];
      if (!selectedNodes) throw new Error("No selection");
      ({ pageData } = await buildData(tabId, tabUrl, selectedNodes))
    }

    const diacritics = pageData.getDiacritization(method === 'original' ? 'original' : 'fullDiacritics')
    const diacriticsSet = new Set(diacritics.map(node => node.elementId));
    const selectedSet = new Set(selectedNodes.map(node => node.elementId));
    const oldNodes = diacritics.filter(node => selectedSet.has(node.elementId));
    const newNodes = selectedNodes.filter(node => !diacriticsSet.has(node.elementId));

    console.log('Processing old nodes:', oldNodes);
    await messageContentScript(tabId, {
      action: 'updateWebsiteText',
      tabUrl: tabUrl,
      replacements: oldNodes,
      ruby: method === 'arabizi'
    });

    if (newNodes.length > 0) {
      console.log('Processing new nodes:', newNodes);
      const newDiacritics = await fullDiacritization(tabId, tabUrl, newNodes, method === 'arabizi');
      pageData.updateDiacritization(newDiacritics, 'fullDiacritics');
    }

    await chrome.storage.local.set({ [tabUrl]: pageData });
    console.log(Object(await chrome.storage.local.get(tabUrl))[tabUrl]);

    if (entirePage) {
      messageContentScript(tabId, { action: 'webpageDone' });
    } else {
      messageContentScript(tabId, { action: 'updateProgressBar', strLength: 100000 });
    }
    return ({ status: 'success' });

  } catch (error) {
    cancelTask(tabId);
    if (entirePage) {
      messageContentScript(tabId, { action: 'webpageDone' });
      messageContentScript(tabId, { action: 'errorMessage', userMessage: (error as Error).message });
    } else {
      messageContentScript(tabId, { action: 'updateProgressBar', strLength: 100000 });
      messageContentScript(tabId, { action: 'errorMessage', userMessage: (error as Error).message });
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Aborted processing webpage:', error.message);
        return ({ status: 'error', errorMessage: 'Processing aborted' });
      }
      console.warn(`Failed to process webpage: ${error.message}`, error.stack);
      return ({ status: 'error', errorMessage: error.message });
    }
    console.warn(`Failed to process webpage: ${error}`);
  }
  return ({ status: 'error', errorMessage: 'Unknown error occurred' });
}

async function buildData(tabId: number, tabUrl: string, selectedNodes?: TextNode[]): Promise<{ pageData: WebpageDiacritizationData }> {

  let pageData: WebpageDiacritizationData;

  const latest = await messageContentScript(tabId, { action: 'getWebsiteText' });

  if (latest.status === 'error') throw new Error(latest.errorMessage);

  const { contentSignature, selectedNodes: allNodes } = latest;

  if (!contentSignature) throw new Error("Didn't get content signature");
  if (!allNodes) throw new Error("Didn't get website text");

  const saved: WebpageDiacritizationData = Object(await chrome.storage.local.get(tabUrl))[tabUrl];

  if (!saved) {

    console.log('No save, creating new webpage data.');
    pageData = await WebpageDiacritizationData.build(tabUrl, contentSignature);

  } else {

    Object.setPrototypeOf(saved, WebpageDiacritizationData.prototype);
    pageData = saved;
    pageData.updateLastVisited(new Date());

    if (saved.contentSignature === contentSignature) {

      console.log('Using saved data.');

    } else {

      console.log('Content has changed, updating.');
      const latestTextMap = new Map(allNodes.map(node => [node.text, node]));
      const updatedOriginals: TextNode[] = [];
      const updatedFullDiacritics: TextNode[] = [];

      saved.getDiacritization('original').forEach(originalNode => {
        const latestNode = latestTextMap.get(originalNode.text);
        if (latestNode) {

          updatedOriginals.push({ ...originalNode, elementId: latestNode.elementId })
          const fullDiacriticNode = saved.getDiacritization('fullDiacritics').find(node => node.elementId === originalNode.elementId);

          if (fullDiacriticNode) {
            updatedFullDiacritics.push({ ...fullDiacriticNode, elementId: latestNode.elementId });
          }

        }

      });

      pageData.updateDiacritization(updatedOriginals, 'original', true);
      pageData.updateDiacritization(updatedFullDiacritics, 'fullDiacritics', true);
    }

  }

  pageData.updateDiacritization(selectedNodes ?? allNodes, 'original');
  return { pageData };
}

export async function fullDiacritization(tabId: number, tabUrl: string, selectedNodes: TextNode[], ruby: boolean = false): Promise<TextNode[]> {

  const { maxChars, maxTries, activePromptIndex, savedPrompts, escalateModel } = extensionOptions;
  const activePrompt: Prompt = savedPrompts[activePromptIndex];

  const controller = new AbortController();
  const { signal: abortSignal } = controller;
  controllerMap.set(tabId, controller);

  const diacritizationBatches = createBatches(selectedNodes, maxChars);
  const claude = await Claude.init();

  const delimiter = '|';
  let elementValidationFailures = 0;
  let chunkValidationFailures = 0;

  const selectedNodesArray = Array.from(selectedNodes);
  const strLength = selectedNodesArray.flatMap((textNode) => textNode.text.split(' ')).length;
  messageContentScript(tabId, { action: 'beginProcessing', strLength });

  // diacritize the texts in parallel with retries
  const diacritizedNodes = await Promise.all(

    diacritizationBatches.map(async (originals) => {

      const originalText = Array.from(originals).map((textNode) => textNode.text.replace(delimiter, '')).join(delimiter);
      if (originalText.replace(/[^\u0621-\u064A]/g, '') === '') {
        console.warn('Skipping diacritization of totally non-Arabic text');
        return originals;
      }

      const replacements: TextNode[] = [];

      const eventEmitter = new EventEmitter();
      const msg = constructAnthropicMessage(originalText, activePrompt, claude);

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
            const validNode: TextNode = { ...textNode, text: newText };

            const checkText = stripDiacritics(newText);
            const refText = stripDiacritics(textNode.text || '');
            const diff = Math.abs(refText.length - checkText.length);
            const fudgeFactor = Math.ceil(refText.length / 50);

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
              elementValidationFailures++;
            }

            messageContentScript(tabId, { action: 'updateProgressBar', strLength: words });
            queue = queue.slice(index + 1);
          }
        });

        const response = await anthropicAPICall(msg, abortSignal, eventEmitter);
        eventEmitter?.emit('text', delimiter);
        const diacritizedText: string = response.content[0].text;
        console.log(`Original: \n${originalText} \nResult: \n${diacritizedText}`);

        const validResponse = validateResponse(originalText, diacritizedText);
        if (validResponse) {
          return replacements;
        }

        messageContentScript(tabId, { action: 'updateWebsiteText', tabUrl, replacements: Array.from(originals), ruby });
        messageContentScript(tabId, { action: 'updateProgressBar', strLength: -acc });
        chunkValidationFailures++;
        if (tries < maxTries) {
          console.warn('Failed validation. trying again: try', tries + 1, 'of', maxTries);
          if (escalateModel) {
            claude.escalateModel(tries);
          }
        } else {
          console.warn('Failed to diacritize chunk after', maxTries, 'tries,');
        }
      }
      console.warn('Failed to diacritize chunk.');
      return [];
    })
  ).then((result) => { return result.flat(); });

  console.log('Failed elements:', elementValidationFailures, '\nFailed chunks:', chunkValidationFailures, '\nDiacritized text:', diacritizedNodes);
  return diacritizedNodes;

  function stripDiacritics(text: string): string {
    return text.trim().normalize('NFC').replace(/\s+/g, ' ').replace(/([\u064B-\u0652\u0621-\u0626\u0640])/g, '');
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
  const stats: { length: number; reason: string; batch: TextNode[]; }[] = [];
  let currentBatch: TextNode[] = [];
  let acc = 0;

  textNodes.forEach((textNode) => {
    const { text } = textNode;
    if (!text) return;

    if (acc > 0 && (acc + text.length) > maxChars) {
      stats.push({ length: acc, reason: 'maxChars', batch: currentBatch });
      textBatches.push(currentBatch);
      currentBatch = [];
      acc = 0;
    }

    currentBatch.push(textNode);
    acc += text.length;

    if (text.match(endOfSentence) && acc > maxChars * 2 / 3) {
      stats.push({ length: acc, reason: 'endOfSentence', batch: currentBatch });
      stats;
      textBatches.push(currentBatch);
      currentBatch = [];
      acc = 0;
    }
  });

  if (currentBatch.length > 0) {
    stats.push({ length: acc, reason: 'endOfText', batch: currentBatch });
    textBatches.push(currentBatch);
  }

  console.log('Created', textBatches.length, 'batches', stats);
  return textBatches;
}
