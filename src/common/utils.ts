// utils.ts
import xxhash from 'xxhash-wasm'

export async function calculateHash(input: string): Promise<string>
export async function calculateHash(input: string[]): Promise<string[]>
export async function calculateHash(input: string | string[]): Promise< string | string[]> {
  const hasher = await xxhash();
  if (typeof input === 'string') {
    if (input === '') { return '' }
    else { return hasher.h64ToString(input) }
  }
  return (input.map((inputText) => {
    if (inputText === '') { return '' }
    else { return hasher.h64ToString(inputText) }
  }));
}

export const sentenceRegex = /[.!?؟]+\s*\n*/g;
