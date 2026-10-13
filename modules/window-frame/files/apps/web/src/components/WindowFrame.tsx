import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { desktop } from '../lib/settings.ts';

/**
 * The desktop app's title bar when "Window decorations from the theme" is on: the page draws it (drag area, minimise, maximise,
 * close) from the current UI style's variables, so it matches the dialogs. Off by default; the system's own frame is used then.
 * Nothing renders in a browser or when the system frame is in use.
 */
export function WindowFrame() {
  const d = desktop();
  const [max, setMax] = useState(false);
  useEffect(() => d?.onWindowState?.(setMax), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d?.customFrame || !d.windowControl) return null;
  const ctl = d.windowControl.bind(d);
  return (
    <div className="bt-wf" onDoubleClick={() => ctl('maximize')}>
      <span className="bt-wf-title">Music Curator</span>
      <div className="bt-wf-btns">
        <button type="button" className="bt-wf-btn" aria-label="Minimise" onClick={() => ctl('minimize')} onDoubleClick={(e) => e.stopPropagation()}><Minus size={14} /></button>
        <button type="button" className="bt-wf-btn" aria-label={max ? 'Restore' : 'Maximise'} onClick={() => ctl('maximize')} onDoubleClick={(e) => e.stopPropagation()}>{max ? <Copy size={12} /> : <Square size={12} />}</button>
        <button type="button" className="bt-wf-btn bt-wf-close" aria-label="Close" onClick={() => ctl('close')} onDoubleClick={(e) => e.stopPropagation()}><X size={15} /></button>
      </div>
    </div>
  );
}
