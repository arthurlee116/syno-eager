## 2024-05-24 - Unstable Function References in Hooks
**Learning:** Functions returned by custom hooks (e.g., `useRecentSearches`) must be wrapped in `useCallback` to ensure reference stability. Without this, consuming components that use these functions in `useEffect` dependency arrays will trigger infinite loops or unnecessary re-executions.
**Action:** Always wrap public API methods of custom hooks in `useCallback`, especially if they are likely to be used as effect dependencies.
