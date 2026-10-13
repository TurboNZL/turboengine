export type UpdateState = {
  status: 'idle' | 'disabled' | 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  /** the new version, once one is found */
  version?: string; percent?: number; message?: string;
  /** an install is running (a password prompt is open) */
  installing?: boolean;
  /** what to run in a terminal when the app could not install the update itself */
  command?: string;
};

/**
 * A release is created the moment a merge lands, and its installers are attached a couple of minutes later. A check in between
 * finds the release but not latest-linux.yml / latest.yml yet, which is not a failure: the next check finds it.
 */
export const isStillBuilding = (message: string) => /Cannot find (latest[\w.-]*\.yml|channel)/i.test(message) || /latest[\w.-]*\.yml.*(404|Not Found)/is.test(message);
export function describeError(message: string): UpdateState {
  return isStillBuilding(message)
    ? { status: 'none', message: 'A new release was just published and its installers are still being built. It will be picked up automatically in a few minutes.' }
    : { status: 'error', message };
}

