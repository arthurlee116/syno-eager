import { renderHook, act } from '@testing-library/react';
import { useMobile } from './useMobile';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

describe('useMobile', () => {
  let matchMediaMock: Mock;
  let changeListener: ((e: MediaQueryListEvent) => void) | null = null;

  beforeEach(() => {
    changeListener = null;

    matchMediaMock = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn((event, callback) => {
        if (event === 'change') {
          changeListener = callback as (e: MediaQueryListEvent) => void;
        }
      }),
      removeEventListener: vi.fn((event, callback) => {
        if (event === 'change' && changeListener === callback) {
          changeListener = null;
        }
      }),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return false by default (desktop)', () => {
    // Default mock returns matches: false
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('should return true when media query matches (mobile)', () => {
    matchMediaMock.mockImplementation((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('should use custom breakpoint', () => {
    const { result } = renderHook(() => useMobile(1024));
    expect(result.current).toBe(false);
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 1023px)');
  });

  it('should update when media query changes', () => {
    // Setup mock to capture listener and return initial state
    matchMediaMock.mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event, callback) => {
        if (event === 'change') {
          changeListener = callback;
        }
      }),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    // Verify listener was attached
    expect(changeListener).toBeTruthy();

    // Simulate change: updates mock implementation for future calls AND calls listener
    act(() => {
        matchMediaMock.mockImplementation((query) => ({
            matches: true,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        if (changeListener) {
            changeListener({ matches: true } as MediaQueryListEvent);
        }
    });

    expect(result.current).toBe(true);
  });
});
