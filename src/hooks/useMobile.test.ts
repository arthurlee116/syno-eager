import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMobile } from './useMobile';

type Listener = () => void;

function createMatchMediaMock(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();

  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_type: string, cb: Listener) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_type: string, cb: Listener) => {
      listeners.delete(cb);
    }),
  };

  return {
    matchMedia: vi.fn(() => mql),
    setMatches(next: boolean) {
      matches = next;
      // Our hook doesn't read the event object, so calling listeners is enough.
      for (const cb of Array.from(listeners)) cb();
    },
  };
}

describe('useMobile', () => {
  it('returns initial matches and updates when media query changes', async () => {
    const mock = createMatchMediaMock(false);
    vi.stubGlobal('matchMedia', mock.matchMedia as unknown as typeof window.matchMedia);

    const { result } = renderHook(() => useMobile(768));
    expect(result.current).toBe(false);

    await act(() => {
      mock.setMatches(true);
    });
    expect(result.current).toBe(true);

    vi.unstubAllGlobals();
  });
});

