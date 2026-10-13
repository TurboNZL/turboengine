import type { DeviceInfo, DeviceLook, DeviceRule } from './types.ts';
/**
 * The look that matches the device: the "Match this device" choice resolves to this. Browsers only reveal the operating system, so which
 * look an OS gets is decided by the rules in themes/config.json (first match wins). Pure, so it can be tested.
 */
export declare function detectLook(d: DeviceInfo, rules?: DeviceRule[]): DeviceLook;
/** Apps that know more than the browser (the Linux desktop environment, say) can tell the engine. */
export declare function setHostInfo(info: Partial<DeviceInfo>): void;
/** The look of the device this page runs on. */
export declare function deviceLook(): DeviceLook;
export declare const resetDeviceLook: () => void;
export declare const prefersDark: () => boolean;
/** Resolves "auto" in the style setting to a real style. */
export declare const effectiveUi: (ui: string) => string;
/** Resolves "auto" in the colour setting to a real palette (light or dark by the device's setting). */
export declare const effectiveTheme: (theme: string) => string;
