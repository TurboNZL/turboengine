import type { Picker } from './picker.ts';
declare const Base: typeof HTMLElement;
export declare class TurboThemesPicker extends Base {
    picker: Picker;
    private off;
    private busy;
    private open;
    private message;
    private seen;
    connectedCallback(): void;
    disconnectedCallback(): void;
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    private sections;
    private changed;
    private render;
    private panel;
    private section;
    private select;
    private themeSection;
    private matchingButton;
    private styleSection;
    private glassRow;
    private wallpaperSection;
    private updatesSection;
}
/** Registers <turbo-themes-picker>. Safe to call more than once. start({ picker: true }) does it. */
export declare function definePicker(): void;
export {};
