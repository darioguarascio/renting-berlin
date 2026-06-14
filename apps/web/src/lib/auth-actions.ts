import { authClient } from '../lib/auth-client';
import { trackEvent } from './rybbit';

export { authClient };

export function getLastUsedProvider(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lastAuthProvider');
}

export function setLastUsedProvider(provider: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lastAuthProvider', provider);
}

function getCallbackUrl(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') ?? '/dashboard';
}

function getSignupCallbackUrl(): string {
  if (typeof window === 'undefined') return '/signup/handle';
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect) {
    return `/signup/handle?redirect=${encodeURIComponent(redirect)}`;
  }
  return '/signup/handle';
}

export async function signInWithProvider(provider: 'google' | 'github'): Promise<void> {
  setLastUsedProvider(provider);
  trackEvent('User Login Started', { method: provider });
  await authClient.signIn.social({
    provider,
    callbackURL: getCallbackUrl(),
  });
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  setLastUsedProvider('email');
  const callbackURL = getCallbackUrl();
  const { data, error } = await authClient.signIn.email({ email, password, callbackURL });
  if (error) {
    throw new Error(error.message ?? 'Sign in failed');
  }
  trackEvent('User Login', { method: 'email' });
  if (data?.url && typeof window !== 'undefined') {
    window.location.href = data.url;
  }
}

export async function signInWithMagicLink(
  email: string,
  options: { name?: string; isSignup?: boolean; captchaToken?: string } = {},
): Promise<void> {
  setLastUsedProvider('magic-link');
  const callbackURL = getCallbackUrl();
  const newUserCallbackURL = getSignupCallbackUrl();
  const headers: Record<string, string> = {};
  if (options.captchaToken) {
    headers['x-captcha-response'] = options.captchaToken;
  }

  const { error } = await authClient.signIn.magicLink({
    email,
    name: options.name?.trim() || undefined,
    callbackURL: options.isSignup ? newUserCallbackURL : callbackURL,
    newUserCallbackURL,
    fetchOptions: { headers },
  });

  if (error) {
    throw new Error(error.message ?? 'Could not send sign-in link');
  }

  trackEvent(options.isSignup ? 'User Signup Started' : 'User Login Started', { method: 'magic-link' });
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  setLastUsedProvider('email');
  const callbackURL = getSignupCallbackUrl();
  const { data, error } = await authClient.signUp.email({ name, email, password, callbackURL });
  if (error) {
    throw new Error(error.message ?? 'Sign up failed');
  }
  trackEvent('User Signup', { method: 'email' });
  if (data?.url && typeof window !== 'undefined') {
    window.location.href = data.url;
  }
}

export async function signOut(): Promise<void> {
  trackEvent('User Logout');
  try {
    await authClient.signOut({ fetchOptions: { timeout: 10_000 } });
  } catch {
    // Still leave the app if the API is slow or unreachable.
  }
  if (typeof window !== 'undefined') {
    window.location.assign('/');
  }
}
