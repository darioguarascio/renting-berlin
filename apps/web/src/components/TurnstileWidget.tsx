import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      const previous = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        previous?.();
        resolve();
      };
    });
  }

  return new Promise((resolve) => {
    window.onTurnstileLoad = () => resolve();
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export default function TurnstileWidget({
  siteKey,
  onTokenChange,
}: {
  siteKey: string;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setFailed(false);
            onTokenChange(token);
          },
          'expired-callback': () => onTokenChange(''),
          'error-callback': () => {
            setFailed(true);
            onTokenChange('');
          },
        });
      })
      .catch(() => {
        setFailed(true);
        onTokenChange('');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onTokenChange]);

  if (!siteKey) return null;

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p className="mt-2 text-sm text-red-600">Captcha failed to load. Refresh and try again.</p>
      )}
    </div>
  );
}
