/** A fast, well-spread 53-bit string hash (cyrb53). Not for security: it only tells "same content" from "different content". */
export declare function hashText(str: string, seed?: number): string;
