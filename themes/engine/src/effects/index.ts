import { getStyle } from '../catalog.ts';
import { syncLiquidGlass } from './liquidGlass.ts';
import { startRipple } from './ripple.ts';

/** Turns on the scripted extras the active style asks for (its `effects` list in theme.json) and off the ones it does not. */
export function syncEffects(styleId: string) {
  const effects = getStyle(styleId)?.effects ?? [];
  syncLiquidGlass(effects.includes('liquid-glass'));
  startRipple();
}
