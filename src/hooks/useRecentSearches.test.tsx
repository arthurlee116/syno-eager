import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from './useRecentSearches';
import { expect, it, describe } from 'vitest';

describe('useRecentSearches', () => {
  it('should have stable function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useRecentSearches());

    const initialAddSearch = result.current.addSearch;
    const initialClearHistory = result.current.clearHistory;

    // Force rerender without state change
    rerender();

    expect(result.current.addSearch).toBe(initialAddSearch);
    expect(result.current.clearHistory).toBe(initialClearHistory);

    // Perform an action that updates state (history changes)
    act(() => {
      result.current.addSearch('test');
    });

    // Function references should remain stable even after state update
    expect(result.current.addSearch).toBe(initialAddSearch);
    expect(result.current.clearHistory).toBe(initialClearHistory);
  });
});
