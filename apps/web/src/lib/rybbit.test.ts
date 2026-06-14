import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from './rybbit';

describe('rybbit', () => {
  const event = vi.fn();

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal('window', {
      rybbit: { event },
    });
    event.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('tracks events', () => {
    trackEvent('User Login', { method: 'email' });
    expect(event).toHaveBeenCalledWith('User Login', { method: 'email' });
  });

  it('waits for rybbit to load', () => {
    vi.useFakeTimers();
    const win = {
      rybbit: undefined as typeof window.rybbit,
      setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
      clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
    };
    vi.stubGlobal('window', win);

    trackEvent('User Login', { method: 'email' });
    expect(event).not.toHaveBeenCalled();

    win.rybbit = { event };
    vi.advanceTimersByTime(100);

    expect(event).toHaveBeenCalledWith('User Login', { method: 'email' });
  });

  it('no-ops when rybbit never loads', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
      clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
    });

    trackEvent('Test');
    vi.advanceTimersByTime(5000);

    expect(event).not.toHaveBeenCalled();
  });
});
