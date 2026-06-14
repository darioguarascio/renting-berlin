export interface RybbitUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export type RybbitEventProperties = Record<string, string | number>;

interface RybbitClient {
  pageview: () => void;
  event: (name: string, properties?: Record<string, string | number>) => void;
  identify: (userId: string) => void;
  clearUserId: () => void;
}

const RYB_BIT_POLL_MS = 100;
const RYB_BIT_MAX_WAIT_MS = 5000;

function withRybbit(fn: (rybbit: RybbitClient) => void): void {
  if (typeof window === 'undefined') return;

  const attempt = () => {
    const rybbit = window.rybbit;
    if (!rybbit) return false;
    fn(rybbit);
    return true;
  };

  if (attempt()) return;

  const deadline = Date.now() + RYB_BIT_MAX_WAIT_MS;
  const timer = window.setInterval(() => {
    if (attempt() || Date.now() >= deadline) {
      window.clearInterval(timer);
    }
  }, RYB_BIT_POLL_MS);
}

export function identifyUser(user: RybbitUser): void {
  withRybbit((rybbit) => {
    rybbit.identify(user.id);
    // Rybbit stores user_id locally and only attaches it to subsequent /track
    // requests — re-send pageview so the identified session shows up immediately.
    rybbit.pageview();
  });
}

export function clearUser(): void {
  withRybbit((rybbit) => rybbit.clearUserId());
}

export function trackEvent(name: string, properties?: RybbitEventProperties): void {
  withRybbit((rybbit) => rybbit.event(name, properties));
}
