import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUser, identifyUser, trackEvent } from './rybbit';

describe('rybbit', () => {
  const identify = vi.fn();
  const clearUserId = vi.fn();
  const event = vi.fn();
  const pageview = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal('window', {
      rybbit: { identify, clearUserId, event, pageview },
    });
    identify.mockClear();
    clearUserId.mockClear();
    event.mockClear();
    pageview.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('identifies users by id only', () => {
    identifyUser({ id: 'u1', name: 'Alex', email: 'alex@example.com' });
    expect(identify).toHaveBeenCalledWith('u1');
    expect(pageview).toHaveBeenCalled();
  });

  it('waits for rybbit to load', () => {
    vi.useFakeTimers();
    const win = {
      rybbit: undefined as typeof window.rybbit,
      setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
      clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
    };
    vi.stubGlobal('window', win);

    identifyUser({ id: 'u1' });
    expect(identify).not.toHaveBeenCalled();

    win.rybbit = { identify, clearUserId, event, pageview };
    vi.advanceTimersByTime(100);

    expect(identify).toHaveBeenCalledWith('u1');
    expect(pageview).toHaveBeenCalled();
  });

  it('clears the user id', () => {
    clearUser();
    expect(clearUserId).toHaveBeenCalled();
  });

  it('tracks events', () => {
    trackEvent('User Login', { method: 'email' });
    expect(event).toHaveBeenCalledWith('User Login', { method: 'email' });
  });

  it('no-ops when rybbit never loads', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
      clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
    });

    identifyUser({ id: 'u1' });
    trackEvent('Test');
    clearUser();

    vi.advanceTimersByTime(5000);

    expect(identify).not.toHaveBeenCalled();
    expect(event).not.toHaveBeenCalled();
    expect(clearUserId).not.toHaveBeenCalled();
  });
});
