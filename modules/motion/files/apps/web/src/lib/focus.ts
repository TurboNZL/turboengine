/** "Open this item and put the cursor at the end of its title" (the Keep views open an item as soon as its first letter is typed): the editor asks once it is on screen. */
let want: string | null = null;
export const wantEditorFocus = (id: string) => { want = id; };
export const takeEditorFocus = (id: string) => { const yes = want === id; if (yes) want = null; return yes; };
