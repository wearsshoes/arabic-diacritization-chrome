// utils.ts
import xxhash from 'xxhash-wasm'

export async function calculateHash(input: string): Promise<string>;
export async function calculateHash(input: string[]): Promise<string[]>;
export async function calculateHash(input: string | string[]): Promise<string | string[]> {
  // Creates the WebAssembly instance.
  const hasher = await xxhash();
  
  // Calculates the 64-bit hash.
  if (Array.isArray(input)) {
    const responseArray: string[] = []
    input.forEach(inputString => {
      const hash64Hex = hasher.h64ToString(inputString);
      responseArray.push(hash64Hex);
    });
    return responseArray;
  } else {
    const hash64Hex = hasher.h64ToString(input);
    return hash64Hex;
  }
}

// Get API Key 
export async function getAPIKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey'], (data: { apiKey?: string }) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const apiKey: string = data.apiKey || '';
        resolve(apiKey);
      }
    });
  });
}

export function chromeStorageGet<T>(key: string): Promise<{ [key: string]: T }> {
  return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], result => {
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result);
      });
  });
}

export function chromeStorageSet(items: { [key: string]: any }): Promise<void> {
  return new Promise((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve();
      });
  });
}