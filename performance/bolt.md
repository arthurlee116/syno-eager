## 2024-05-24 - [ResultsView Memoization]
**Learning:** The `App` component triggers a second render cycle after search results load due to the `useRecentSearches` hook updating local storage history. This forces expensive child components like `ResultsView` to re-render needlessly when their props haven't changed.
**Action:** Wrap expensive leaf components that accept stable data structures in `React.memo` to prevent redundant rendering during parent state updates that don't affect them.
