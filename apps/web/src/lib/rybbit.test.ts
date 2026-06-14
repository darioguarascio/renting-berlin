import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUser, identifyUser, setUserTraits, trackEvent } from './rybbit';

describe('rybbit', () => {
  const identify = vi.fn();
  const clearUserId = vi.fn();
  const event = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('window', {
      rybbit: { identify, clearUserId, event },
    });
    identify.mockClear();
    clearUserId.mockClear();
    event.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('identifies users with traits', () => {
    identifyUser({ id: 'u1', name: 'Alex', email: 'alex@example.com' });
    expect(identify).toHaveBeenCalledWith('u1', { name: 'Alex', email: 'alex@example.com' });
  });

  it('identifies users without optional traits', () => {
    identifyUser({ id: 'u1' });
    expect(identify).toHaveBeenCalledWith('u1', {});
  });

  it('sets user traits through onReady when needed', () => {
    const setTraits = vi.fn();
    vi.stubGlobal('window', {
      rybbit: {
        identify,
        clearUserId,
        event,
        onReady: (callback: (client: { setTraits: typeof setTraits }) => void) =>
          callback({ setTraits }),
      },
    });

    setUserTraits({ plan: 'free' });
    expect(setTraits).toHaveBeenCalledWith({ plan: 'free' });
  });

  it('clears the user id', () => {
    clearUser();
    expect(clearUserId).toHaveBeenCalled();
  });

  it('tracks events', () => {
    trackEvent('User Login', { method: 'email' });
    expect(event).toHaveBeenCalledWith('User Login', { method: 'email' });
  });

  it('no-ops when rybbit is unavailable', () => {
    vi.stubGlobal('window', {});
    identifyUser({ id: 'u1' });
    trackEvent('Test');
    clearUser();
    expect(identify).not.toHaveBeenCalled();
    expect(event).not.toHaveBeenCalled();
    expect(clearUserId).not.toHaveBeenCalled();
  });
});
