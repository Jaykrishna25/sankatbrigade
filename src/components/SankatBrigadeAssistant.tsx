import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import type { AssistantApi } from '../hooks/useAssistant';
import { formatTime } from '../utils/labels';

/**
 * SankatBrigade Assistant — the view.
 *
 * All of the logic lives in useAssistant(), so the same single conversation is
 * rendered here whether it appears in the floating dock, on the full Assistant
 * screen, or beside an incident on the analysis screen.
 */

interface AssistantProps {
  api: AssistantApi;
  variant?: 'inline' | 'docked' | 'page';
  onClose?: () => void;
}

export default function SankatBrigadeAssistant({ api, variant = 'inline', onClose }: AssistantProps) {
  const [draft, setDraft] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);

  // Keep the newest message in view, but leave the opening summary at the top
  // when the panel first appears so it is read from the beginning.
  useEffect(() => {
    const node = chatRef.current;
    if (!node) return;
    const firstRun = previousCount.current === 0;
    const grew = api.messages.length > previousCount.current;
    // Reopening the panel jumps to the latest message; a brand new conversation
    // (just the opening summary) stays at the top so it is read from the start.
    if ((firstRun && api.messages.length > 3) || (!firstRun && grew)) {
      node.scrollTop = node.scrollHeight;
    }
    previousCount.current = api.messages.length;
  }, [api.messages]);

  const submit = (text: string) => {
    api.send(text);
    setDraft('');
  };

  return (
    <div className={`sb-card sb-assistant sb-assistant--${variant}`}>
      <div className="sb-assistant__head">
        <span className="sb-assistant__avatar">
          <Icon name="radio" size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sb-assistant__name">SankatBrigade Assistant</div>
          <div className="sb-assistant__status">
            <span className="sb-badge__dot" style={{ background: 'var(--ok)' }} />
            {api.mode === 'incident' ? `Connected to ${api.incidentId} · ` : ''}
            {api.ai.enabled
              ? `rules decide priority · AI layer on (${api.ai.provider})`
              : 'deterministic · runs offline · no AI model, no server'}
          </div>
        </div>
        {/* On the analysis screen the panel belongs to the incident on screen,
            so detaching from there would be confusing — the control is offered
            in the dock and on the Assistant screen instead. */}
        {variant !== 'inline' && (
          <button
            type="button"
            className="sb-icon-btn"
            onClick={api.clear}
            aria-label="Start a new conversation"
            title="Start a new conversation"
          >
            <Icon name="refresh" size={15} />
          </button>
        )}
        {onClose && (
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close the assistant">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <div className="sb-chat" ref={chatRef} role="log" aria-live="polite" aria-label="Assistant conversation">
        {api.messages.map((entry) => (
          <div key={entry.id} className={`sb-msg sb-msg--${entry.role}`}>
            {entry.text}
            {entry.actions && entry.actions.length > 0 && (
              <span className="sb-msg__actions">
                {entry.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={`sb-btn sb-btn--sm ${action.kind === 'submit_report' ? 'sb-btn--danger' : 'sb-btn--ghost'}`}
                    onClick={() => api.runAction(action)}
                  >
                    {action.kind === 'submit_report' && <Icon name="send" size={14} />}
                    {action.label}
                  </button>
                ))}
              </span>
            )}
            {entry.role !== 'system' && (
              <span className="sb-msg__meta">
                {entry.role === 'bot' ? 'SankatBrigade Assistant' : 'You'} · {formatTime(entry.at)}
                {entry.viaAi && ' · AI language layer (priority still set by the rules)'}
              </span>
            )}
          </div>
        ))}

        {api.thinking && (
          <div className="sb-msg sb-msg--bot sb-msg--thinking" aria-live="polite">
            <span className="sb-spinner" />
            Thinking…
          </div>
        )}
      </div>

      <div className="sb-quick">
        {api.chips.map((chip) => (
          <button key={chip} type="button" className="sb-quick__btn" onClick={() => submit(chip)}>
            {chip}
          </button>
        ))}
      </div>

      <form
        className="sb-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label className="sb-visually-hidden" htmlFor={`sb-assistant-input-${variant}`}>
          Message the SankatBrigade Assistant
        </label>
        <input
          id={`sb-assistant-input-${variant}`}
          className="sb-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={api.placeholder}
          autoComplete="off"
        />
        <button type="submit" className="sb-btn sb-btn--primary sb-btn--sm" aria-label="Send message">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}
