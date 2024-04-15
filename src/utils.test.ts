// utils.test.ts
import { calculateHash } from './utils';
import xxhash from 'xxhash-wasm';

jest.mock('xxhash-wasm' as any, () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({
        h64ToString: jest.fn((input: string) => {
            if (input === 'hello') return '26c7827d889f6da3';
            if (input === 'world') return 'e778fbfe66ee51ef';
            return '45ab6734b21e6968';
        }),
    }),
}));

describe('calculateHash', () => {
    it('should calculate the hash of a single string', async () => {
        const input = 'hello world';
        const expectedHash = '45ab6734b21e6968';
        const result = await calculateHash(input);
        expect(result).toBe(expectedHash);
        expect(xxhash).toHaveBeenCalledTimes(1);
    });

    it('should calculate the hash of an array of strings', async () => {
        const input = ['hello', 'world'];
        const expectedHashes = ['26c7827d889f6da3', 'e778fbfe66ee51ef'];
        const result = await calculateHash(input);
        expect(result).toEqual(expectedHashes);
        expect(xxhash).toHaveBeenCalledTimes(2);
    });
});