import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from './useRecentSearches';
import { describe, it, expect, vi } from 'vitest';

describe('useRecentSearches', () => {
  it('should return a stable addSearch function', () => {
    const { result, rerender } = renderHook(() => useRecentSearches());
    const firstAddSearch = result.current.addSearch;

    rerender();
    const secondAddSearch = result.current.addSearch;

    expect(secondAddSearch).toBe(firstAddSearch);
  });
});
