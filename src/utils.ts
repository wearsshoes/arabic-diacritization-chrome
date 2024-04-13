// utils.ts
import xxhash from 'xxhash-wasm'


export async function calculateHash(input: string | string[]): Promise<string | string[]> {
    // Creates the WebAssembly instance.
    const hasher = await xxhash();
    const responseArray: string[] = []
  
    // Calculates the 64-bit hash.
    if (Array.isArray(input)) {
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