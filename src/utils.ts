// utils.ts
import xxhash from 'xxhash-wasm'


export async function calculateHash(input: string[]): Promise<string[]> {
    // Creates the WebAssembly instance.
    const hasher = await xxhash();
    const response: string[] = []
  
    // Calculates the 64-bit hash.
    input.forEach(inputString => {
      const hash64Hex = hasher.h64ToString(inputString);
      response.push(hash64Hex)
    });
    
    return response;
  }