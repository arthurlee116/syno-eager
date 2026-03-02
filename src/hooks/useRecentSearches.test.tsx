import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from './useRecentSearches';
import { expect, test } from 'vitest';
import React, { useEffect } from 'react';

test('addSearch reference is stable', () => {
    const { result } = renderHook(() => useRecentSearches());
    const initialAddSearch = result.current.addSearch;

    act(() => {
        result.current.addSearch('test');
    });

    expect(result.current.addSearch).toBe(initialAddSearch);
});

test('App does not infinite loop', () => {
    let renderCount = 0;
    const TestComponent = () => {
        renderCount++;
        const { history, addSearch } = useRecentSearches();

        useEffect(() => {
            addSearch('test');
        }, [addSearch]);

        return <div>{history.length}</div>;
    };

    renderHook(() => <TestComponent />);
    expect(renderCount).toBeLessThan(10);
});
