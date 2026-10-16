/** The items just made on this page: their row plays the "arrive" animation once, when it first appears (a row that is only scrolled into view or reloaded does not). */
const fresh = new Set<string>();
export const markFresh = (id: string) => { fresh.add(id); setTimeout(() => fresh.delete(id), 4000); };
export const takeFresh = (id: string) => fresh.has(id); // not deleted here: React may build a row twice in development
