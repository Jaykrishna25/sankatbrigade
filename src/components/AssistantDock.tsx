import { useEffect, useRef } from 'react';
import Icon from './Icons';
import SankatBrigadeAssistant from './SankatBrigadeAssistant';
import type { AssistantApi } from '../hooks/useAssistant';

/**
 * The floating assistant: a launcher button in the corner of every screen and
 * the docked panel it opens. On a phone the panel becomes a full-height sheet.
 */

interface AssistantDockProps {
  api: AssistantApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssistantDock({ api, open, onOpenChange }: AssistantDockProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('input')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div className="sb-dock" ref={panelRef} role="dialog" aria-label="SankatBrigade Assistant">
          <SankatBrigadeAssistant api={api} variant="docked" onClose={() => onOpenChange(false)} />
        </div>
      )}

      <button
        type="button"
        ref={launcherRef}
        className={`sb-fab${open ? ' is-open' : ''}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={open ? 'Close the SankatBrigade Assistant' : 'Open the SankatBrigade Assistant'}
      >
        <Icon name={open ? 'close' : 'radio'} size={22} />
        {!open && <span className="sb-fab__label">Ask the Assistant</span>}
        {!open && <span className="sb-fab__pulse" aria-hidden="true" />}
      </button>
    </>
  );
}
