import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRecentSearches } from './useRecentSearches';

describe('useRecentSearches', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useRecentSearches());

    const initialAddSearch = result.current.addSearch;
    const initialClearHistory = result.current.clearHistory;

    rerender();

    expect(result.current.addSearch).toBe(initialAddSearch);
    expect(result.current.clearHistory).toBe(initialClearHistory);
  });

  it('should not update history if word is already at the top', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearch('test');
    });

    const firstHistory = result.current.history;

    act(() => {
      result.current.addSearch('test');
    });

    const secondHistory = result.current.history;

    // Checks if the array reference is the same (optimization)
    expect(secondHistory).toBe(firstHistory);
    expect(result.current.history).toEqual(['test']);
  });
});
