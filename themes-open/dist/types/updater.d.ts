import type { Source } from './source.ts';
export type UpdateStatus = 'updated' | 'current' | 'engine-too-old' | 'failed';
export interface UpdateResult {
    status: UpdateStatus;
    /** One sentence for the user. */
    message: string;
    added?: string[];
    removed?: string[];
}
/** Downloads the newest themes and switches to them. Never throws: a failed update leaves the current themes alone. */
export declare function checkForUpdates(source: Source, o?: {
    retryDelayMs?: number;
}): Promise<UpdateResult>;
export declare const lastChecked: () => number | null;
/** True if a background check is due. */
export declare const checkDue: (everyMs: number) => boolean;
export declare const builtinHash: () => string;
