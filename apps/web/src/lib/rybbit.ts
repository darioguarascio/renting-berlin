export interface RybbitUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export type RybbitEventProperties = Record<string, string | number>;

interface RybbitClient {
  event: (name: string, properties?: Record<string, string | number>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  setTraits: (traits: Record<string, unknown>) => void;
  clearUserId: () => void;
  onReady: (callback: (rybbit: RybbitClient) => void) => void;
}

function withRybbit(fn: (rybbit: RybbitClient) => void): void {
  if (typeof window === 'undefined') return;
  const rybbit = window.rybbit;
  if (!rybbit) return;
  if (typeof rybbit.onReady === 'function') {
    rybbit.onReady(fn);
  } else {
    fn(rybbit);
  }
}

export function identifyUser(user: RybbitUser): void {
  withRybbit((rybbit) => {
    rybbit.identify(user.id, {
      ...(user.name ? { name: user.name } : {}),
      ...(user.email ? { email: user.email } : {}),
    });
  });
}

export function clearUser(): void {
  withRybbit((rybbit) => rybbit.clearUserId());
}

export function setUserTraits(traits: Record<string, unknown>): void {
  withRybbit((rybbit) => rybbit.setTraits(traits));
}

export function trackEvent(name: string, properties?: RybbitEventProperties): void {
  withRybbit((rybbit) => rybbit.event(name, properties));
}
