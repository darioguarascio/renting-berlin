import { useCallback, useState } from 'react';
import type { OAuthProvider } from '../lib/auth';
import {
  getLastUsedProvider,
  signInWithEmail,
  signInWithMagicLink,
  signInWithProvider,
} from '../lib/auth-actions';
import { DEV_ACCOUNTS, showDevLogin } from '../lib/dev-user';
import Logo from './Logo';
import TurnstileWidget from './TurnstileWidget';

type Mode = 'login' | 'signup';

const PROVIDERS: { id: OAuthProvider; label: string; icon: string }[] = [
  { id: 'google', label: 'Google', icon: 'G' },
  { id: 'github', label: 'GitHub', icon: '⌘' },
];

export default function AuthForm({
  mode: initialMode = 'login',
  enabledProviders = [],
  turnstileSiteKey = '',
}: {
  mode?: Mode;
  enabledProviders?: OAuthProvider[];
  turnstileSiteKey?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const lastUsed = getLastUsedProvider();
  const captchaRequired = Boolean(turnstileSiteKey);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const enabledSet = new Set(enabledProviders);
  const sortedProviders = PROVIDERS.filter((provider) => enabledSet.has(provider.id)).sort((a, b) => {
    if (a.id === lastUsed) return -1;
    if (b.id === lastUsed) return 1;
    return 0;
  });

  async function handleDevLogin(devEmail: string, password: string) {
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(devEmail, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('Invalid origin')
          ? 'Dev login blocked by origin check. Restart dev on port 4321 or refresh after pulling the latest code.'
          : message || 'Dev login failed. Run: npm run db:seed',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (captchaRequired && !captchaToken) {
      setError('Please complete the captcha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithMagicLink(email, {
        name: mode === 'signup' ? name : undefined,
        isSignup: mode === 'signup',
        captchaToken: captchaToken || undefined,
      });
      setLinkSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message || 'Could not send sign-in link. Try again in a moment.');
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setLinkSent(false);
    setCaptchaToken('');
  }

  if (linkSent) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card-float p-6 sm:p-8">
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">Check your email</h1>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            We sent a sign-in link to <span className="font-semibold text-[var(--color-ink)]">{email}</span>.
            Click the link in the email to continue — it expires in 15 minutes.
          </p>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            Didn't get it? Check spam, or{' '}
            <button
              type="button"
              onClick={() => {
                setLinkSent(false);
                setCaptchaToken('');
              }}
              className="font-semibold text-[var(--color-brand)] hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="card-float p-6 sm:p-8">
        <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">
          {mode === 'login' ? 'Welcome back' : 'Join renting.berlin'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {mode === 'login'
            ? 'Sign in to save favorites, message landlords, and publish listings.'
            : 'Berlin rentals — built for Berliners. No password needed.'}
        </p>

        {showDevLogin && mode === 'login' && (
          <div className="mt-5 rounded-xl border border-dashed border-[var(--color-brand)] bg-[var(--color-brand-muted)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-brand-deep)]">Development</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              One-click login — password <span className="font-mono text-xs">devdevdev</span> for both
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {DEV_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDevLogin(account.email, account.password)}
                  disabled={loading}
                  className="btn-teal text-sm disabled:opacity-50"
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {sortedProviders.length > 0 && (
          <>
            <div className="mt-6 space-y-2.5">
              {sortedProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => signInWithProvider(provider.id)}
                  className="btn-ghost relative w-full"
                >
                  {provider.id === lastUsed && (
                    <span className="absolute -top-2 right-3 rounded-full bg-[var(--color-signal)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Last used
                    </span>
                  )}
                  <span className="flex size-5 items-center justify-center rounded-md bg-[var(--color-brand-muted)] text-xs font-bold text-[var(--color-brand)]">
                    {provider.icon}
                  </span>
                  Continue with {provider.label}
                </button>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">or email</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
        )}

        <form onSubmit={handleMagicLinkSubmit} className={`space-y-4${sortedProviders.length === 0 ? ' mt-6' : ''}`}>
          {mode === 'signup' && (
            <label className="block">
              <span className="field-label">Name</span>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
            </label>
          )}
          <label className="block">
            <span className="field-label">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
          </label>
          {captchaRequired && (
            <TurnstileWidget siteKey={turnstileSiteKey} onTokenChange={handleCaptchaToken} />
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
            className="btn-brand w-full disabled:opacity-50"
          >
            {loading ? 'Sending link…' : mode === 'login' ? 'Email me a sign-in link' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
          {mode === 'login' ? (
            <>No account? <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-[var(--color-brand)] hover:underline">Sign up free</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => switchMode('login')} className="font-semibold text-[var(--color-brand)] hover:underline">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
