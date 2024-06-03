import Anthropic from '@anthropic-ai/sdk';
import { calculateHash } from '../common/utils';
import { Prompt } from "../common/optionsClass";
import { EventEmitter } from 'events'
import { scheduler } from './background';
import { extensionOptions } from './background';

interface Models {
  [key: string]: Model;
}

interface Model {
  currentVersion: string;
  level: number;
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

class Claude {

  private constructor(
    public model: Model,
    public apiKey: string = ''
  ) { }

  static async init() {
    const model = claude[extensionOptions.activeModel];
    const apiKey = extensionOptions.activeKey;
    return new Claude(model, apiKey);
  }

  escalateModel(n: number = 1) {
    const models = Object.values(claude);
    const newModel = models.find(model => model.level === n);
    if (newModel) this.model = newModel;
    console.log('Escalated task to:', this.model);
  }
}

async function anthropicAPICall(params: Anthropic.MessageCreateParams, key?: string, signal?: AbortSignal, eventEmitter?: EventEmitter): Promise<Anthropic.Message> {
  // generate a hash to identify the job
  const hash = await calculateHash(JSON.stringify(params));

  // get the API key if it's not provided
  const apiKey = key;
  if (!apiKey) {
    throw new Error('API key not set');
  }
  const client = new Anthropic({ apiKey: apiKey });
  console.log('Queued job', hash);

  return new Promise((resolve, reject) => {

    scheduler.schedule(async () => {
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
              console.warn('API error:', error);
              reject(error);
            })
            .on('abort', (error) => {
              reject(error);
            });
        });

        console.log(`Job ${hash} completed.`);
        resolve(finalResult);
      } catch (error) {
        // Log rate limit details
        if (error instanceof Anthropic.APIError) {
          const { headers, message } = error;
          if (message === 'Request was aborted.') {
            console.warn('Anthropic API request was aborted.');
          }
          if (headers && message === 'Rate limit exceeded.') {
            console.error(`Rate Limit Details:
            Requests Limit: ${headers['anthropic-ratelimit-requests-limit']}
            Requests Remaining: ${headers['anthropic-ratelimit-requests-remaining']}
            Requests Reset: ${headers['anthropic-ratelimit-requests-reset']}
            Tokens Limit: ${headers['anthropic-ratelimit-tokens-limit']}
            Tokens Remaining: ${headers['anthropic-ratelimit-tokens-remaining']}
            Tokens Reset: ${headers['anthropic-ratelimit-tokens-reset']}`);
          }
        }
        reject(error);
      }
    }).catch((error: Error) => {
      reject(error);
    });
  });
}

async function countSysPromptTokens(): Promise<number> {
  const { activePromptIndex, savedPrompts = [] } = extensionOptions;
  const activePrompt = savedPrompts[activePromptIndex];

  if (!activePrompt) throw new Error('No prompt selected');
  if (activePrompt.tokenLength && activePrompt.tokenLength !== 0) return activePrompt.tokenLength;

  const existingPrompt = savedPrompts.find((p: Prompt) => p.name === activePrompt.name);
  if (existingPrompt && existingPrompt.tokenLength) return existingPrompt.tokenLength;

  // Make the API call using the provided message format
  const sysPromptTokens = await anthropicAPICall({
    model: claude.haiku.currentVersion,
    max_tokens: 1,
    temperature: 0,
    messages: [{ role: "user", content: [{ type: "text", text: activePrompt.text }] }]
  }).then(response => response.usage.input_tokens);

  // Update tokenLength for both the selected prompt and saved prompts
  activePrompt.tokenLength = sysPromptTokens;
  if (existingPrompt) {
    existingPrompt.tokenLength = sysPromptTokens;
  } else {
    savedPrompts.push(activePrompt);
  }

  await chrome.storage.sync.set({ savedPrompts });
  return sysPromptTokens;
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

export { Claude, anthropicAPICall, countSysPromptTokens };