import { useEffect, useState } from 'react';
import Icon from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Install card. It only appears when the browser actually offers installation,
 * so nothing here promises a capability the device does not have.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="sb-install" role="status">
        <Icon name="check" size={18} />
        <span className="sb-install__text">
          SankatBrigade is installed. Limited prototype access is available offline — real-time coordination
          requires connectivity.
        </span>
      </div>
    );
  }

  if (!deferred || dismissed) return null;

  return (
    <div className="sb-install">
      <Icon name="install" size={20} />
      <span className="sb-install__text">
        <strong>Install SankatBrigade</strong> — add it to this device so the app shell and your local
        incidents open without a connection.
      </span>
      <div className="sb-btn-row">
        <button
          type="button"
          className="sb-btn sb-btn--primary sb-btn--sm"
          onClick={async () => {
            try {
              await deferred.prompt();
              await deferred.userChoice;
            } catch {
              /* the browser closed the prompt */
            }
            setDeferred(null);
          }}
        >
          Install app
        </button>
        <button type="button" className="sb-btn sb-btn--subtle sb-btn--sm" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
