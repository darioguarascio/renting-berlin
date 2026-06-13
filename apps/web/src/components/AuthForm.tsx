import { useState } from 'react';
import { getLastUsedProvider, signInWithEmail, signInWithProvider, signUpWithEmail } from '../lib/auth-actions';
import { DEV_ACCOUNTS, showDevLogin } from '../lib/dev-user';
import Logo from './Logo';

type Mode = 'login' | 'signup';

const PROVIDERS = [
  { id: 'google' as const, label: 'Google', icon: 'G' },
  { id: 'github' as const, label: 'GitHub', icon: '⌘' },
];

export default function AuthForm({ mode: initialMode = 'login' }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lastUsed = getLastUsedProvider();

  const sortedProviders = [...PROVIDERS].sort((a, b) => {
    if (a.id === lastUsed) return -1;
    if (b.id === lastUsed) return 1;
    return 0;
  });

  async function handleDevLogin(email: string, password: string) {
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
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

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch {
      setError('Authentication failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
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
            : 'Berlin rentals, English-first — built for internationals.'}
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

        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
          <label className="block">
            <span className="field-label">Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-brand w-full disabled:opacity-50">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
          {mode === 'login' ? (
            <>No account? <button type="button" onClick={() => setMode('signup')} className="font-semibold text-[var(--color-brand)] hover:underline">Sign up free</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setMode('login')} className="font-semibold text-[var(--color-brand)] hover:underline">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
