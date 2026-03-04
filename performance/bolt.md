## 2024-03-04 - Stabilize custom hook functions to prevent infinite loops
**Learning:** Returning unmemoized functions from custom hooks like `useRecentSearches` can cause infinite render loops when those functions are used in `useEffect` dependency arrays of the parent component.
**Action:** Always wrap functions returned by custom hooks in `useCallback` to guarantee reference stability.
