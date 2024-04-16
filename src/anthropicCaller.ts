import Anthropic from '@anthropic-ai/sdk';
import Bottleneck from 'bottleneck'
import { SysPromptTokenCache } from './types';
import { calculateHash, getAPIKey } from './utils';
export { claude, defaultModel, anthropicAPICall, countSysPromptTokens, escalateModel };

// some parts of these functions will get refactored back into background.ts
interface Models {
    [key: string]: Model;
}

interface Model {
    currentVersion: string;
    level: number;
}
// Rate-limited Anthropic API call function
const anthropicLimiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 1500
});


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

function escalateModel(model: Model, n: number): Model {
    // return the model whose level is one higher than the input model using map
    const mPlusOne = Object.values(claude).find((m) => m.level === model.level + n);
    if (mPlusOne) {
        return mPlusOne;
    } else {
        return model;
    }
}

async function anthropicAPICall(params: Anthropic.MessageCreateParams, key?: string, hash?: string): Promise<any> {

    // get the API key if it's not provided
    const apiKey = key || await getAPIKey();
    if (!apiKey) {
        // should rewrite to pass getAPIKey error to the caller
        throw new Error('API key not set');
    }

    const anthropic = new Anthropic({ apiKey: apiKey });
    console.log('Queued job', hash);
    return anthropicLimiter.schedule(async () => {
        try {
            console.log('Sent job', hash);
            const result = await anthropic.messages.create(params);
            console.log('Received result for:', hash);
            return result;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error message:', error.message);
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