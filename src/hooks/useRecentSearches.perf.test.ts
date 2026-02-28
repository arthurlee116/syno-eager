import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRecentSearches } from './useRecentSearches';

describe('useRecentSearches Performance', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('maintains reference stability for addSearch and clearHistory across renders', () => {
    const { result, rerender } = renderHook(() => useRecentSearches());

    const initialAddSearch = result.current.addSearch;
    const initialClearHistory = result.current.clearHistory;

    // Trigger a state change which will cause a re-render
    act(() => {
      result.current.addSearch('test');
    });

    // The component re-renders internally after state update, but we can also force a re-render from outside
    rerender();

    // The references to the functions should be identical after rendering
    expect(result.current.addSearch).toBe(initialAddSearch);
    expect(result.current.clearHistory).toBe(initialClearHistory);
  });
});
