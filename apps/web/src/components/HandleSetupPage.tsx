import { authClient } from '../lib/auth-client';
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, suggestHandleFromName } from '../lib/urls';
import AccountHandleForm from './AccountHandleForm';
import Logo from './Logo';

function getRedirectTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') ?? '/dashboard';
}

export default function HandleSetupPage() {
  const { data: session } = authClient.useSession();
  const redirectTo = getRedirectTarget();
  const suggestedHandle = session?.user?.name ? suggestHandleFromName(session.user.name) : undefined;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="card-float p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">Almost there</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-[var(--color-ink)]">Choose your handle</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Your @handle is permanent and powers your public profile URL. Use {HANDLE_MIN_LENGTH}–{HANDLE_MAX_LENGTH} characters:
          letters, numbers, underscores, and hyphens.
        </p>
        <div className="mt-6">
          <AccountHandleForm suggestedHandle={suggestedHandle} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
