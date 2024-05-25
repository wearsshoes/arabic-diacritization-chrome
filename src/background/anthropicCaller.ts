import Anthropic from '@anthropic-ai/sdk';
// @ts-expect-error No types for "bottleneck/light"
import BottleneckLight from "bottleneck/light.js";
import { calculateHash } from '../common/utils';
import { getAPIKey } from "../common/utils";
import { Prompt } from '../common/types';
import { EventEmitter } from 'events';

export { claude, defaultModel, anthropicAPICall, countSysPromptTokens };

export class Claude {
  constructor(
    public model: Model = defaultModel,
    public apiKey: string = ''
  ) {
    this.initialize();
  }

  async initialize() {
    this.apiKey = await getAPIKey();
  }

  escalateModel(n: number = 1) {
    const models = Object.values(claude);
    const newModel = models.find(model => model.level === n);
    if (newModel) this.model = newModel;
    console.log('Escalated task to:', this.model);
  }
}

interface Models {
  [key: string]: Model;
}

interface Model {
  currentVersion: string;
  level: number;
}
// Rate-limited Anthropic API call function
const anthropicLimiter = new BottleneckLight({
  maxConcurrent: 3,
  minTime: 1500
});

interface SysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}

const claude: Models = {
  haiku: {
    currentVersion: "claude-3-haiku-20240307",
    level: 0
  },
  sonnet: {
    currentVersion: "claude-3-sonnet-20240229",
    level: 1
  },
  opus: {
    currentVersion: "claude-3-opus-20240229",
    level: 2
  }
};

const defaultModel: Model = claude.haiku;

async function anthropicAPICall(params: Anthropic.MessageCreateParams, key?: string, signal?: AbortSignal, eventEmitter?: EventEmitter): Promise<Anthropic.Message> {

  // generate a hash to identify the job
  const hash = await calculateHash(JSON.stringify(params));

  // get the API key if it's not provided
  const apiKey = key || await getAPIKey();
  if (!apiKey) {
    // should rewrite to pass getAPIKey error to the caller
    throw new Error('API key not set');
  }

  const client = new Anthropic({ apiKey: apiKey });
  console.log('Queued job', hash);

  // TODO: write abortSignal handling for bottleneck
  return anthropicLimiter.schedule(async () => {
    try {
      console.log('Sent job', hash, 'to', params.model);

      const finalResult: Anthropic.Message = await new Promise((resolve, reject) => {
        client.messages.stream(params, { signal })
          .on('text', (textDelta) => {
            eventEmitter?.emit('text', textDelta);
          })
          .on('finalMessage', (message) => {
            resolve(message);
          })
          .on('error', (error) => {
            console.error('Received error:', error);
            reject(error);
          })
          .on('abort', (error) => {
            console.error('Stream aborted:', error);
            reject(error);
          })
      });

      console.log(`Job ${hash} completed.`);
      return finalResult;

    } catch (error) {

      // Log rate limit details
      if (error instanceof Anthropic.APIError) {
        console.error('Anthropic API Error:', error.message);
        const { headers } = error;
        if (headers) {
          console.error(`Rate Limit Details:
          Requests Limit: ${headers['anthropic-ratelimit-requests-limit']}
          Requests Remaining: ${headers['anthropic-ratelimit-requests-remaining']}
          Requests Reset: ${headers['anthropic-ratelimit-requests-reset']}
          Tokens Limit: ${headers['anthropic-ratelimit-tokens-limit']}
          Tokens Remaining: ${headers['anthropic-ratelimit-tokens-remaining']}
          Tokens Reset: ${headers['anthropic-ratelimit-tokens-reset']}`);
        }
      }
      throw error;
    }
  });
}

// Check number of system prompt tokens, look up in cache, or call API
async function countSysPromptTokens(prompt: string, model?: string): Promise<number> {
  const modelUsed = model || defaultModel.currentVersion;
  const promptHash = await calculateHash(prompt) as string;

  const storedTokenCount = await getStoredPromptTokenCount(promptHash, modelUsed);
  if (storedTokenCount !== null) {
    return storedTokenCount;
  }

  const msg = await anthropicAPICall({
    model: modelUsed,
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

  const sysPromptTokens: number = msg.usage.input_tokens;
  saveSysPromptTokenCount(promptHash, modelUsed, sysPromptTokens);

  return sysPromptTokens;
}

async function getStoredPromptTokenCount(promptHash: string, model: string): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('savedResults', (data: { savedResults?: SysPromptTokenCache[] }) => {
      if (Array.isArray(data.savedResults)) {
        const storedPrompt = data.savedResults.find(
          (result) => result.hash === promptHash && result.model === model
        );
        if (storedPrompt) {
          return resolve(storedPrompt.tokens);
        }
      }
      resolve(null);
    });
  });
}

function saveSysPromptTokenCount(promptHash: string, model: string, tokens: number): void {
  chrome.storage.sync.get('savedResults', (data: { savedResults?: SysPromptTokenCache[] }) => {
    const savedResults = data.savedResults || [];
    savedResults.push({ hash: promptHash, model, tokens });
    chrome.storage.sync.set({ savedResults });
  });
}

// Function to construct the message and make the API call
export function constructAnthropicMessage(
  text: string,
  prompt: Prompt,
  claude: Claude

): Anthropic.Messages.MessageCreateParams {
  return {
    model: claude.model.currentVersion,
    max_tokens: 4000,
    temperature: 0,
    system: prompt.text,
    stream: true,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Input: ${text} \nOutput:`,
          }
        ]
      }
    ]
  };
}
