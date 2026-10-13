import { useSyncExternalStore } from 'react';
import { getRevision, subscribe } from 'turbothemes';

/** Re-renders when the themes change (an online update replaced them). Call it in any component that lists palettes, styles or layouts. */
export const useCatalog = () => useSyncExternalStore(subscribe, getRevision);
