# Bolt's Performance Journal

Critical learnings from performance optimization work on Syno-Eager.

---

## 2026-02-09 - matchMedia vs resize Event for Viewport Detection

**Learning:** The original `useMobile` hook used a `resize` event listener which fires on every pixel change during window resizing. This causes excessive callback invocations even when the mobile state doesn't change (e.g., resizing from 1000px to 900px when breakpoint is 768px).

**Action:** The hook now uses `matchMedia` with `change` listener fallback (`addEventListener` / legacy `addListener`) and local `useState` synchronization. This keeps updates to breakpoint transitions only and avoids `resize` flood callbacks.

---

## 2026-02-09 - Persistent Cache for Immutable Data

**Learning:** Dictionary and connotation results are relatively stable, but cache currently lives in memory only. Reloads will still re-fetch.

**Action:** Current policy uses long `staleTime`/`gcTime` to reduce repeat fetches within a session while keeping memory bounded. Persistent cache is not enabled yet and can be added later if cross-refresh cache retention becomes a product requirement.

---

## 2026-02-12 - Double Render on Search History Update

**Learning:** The `App` component updates search history (`useRecentSearches`) inside a `useEffect` that triggers immediately after search results arrive. This causes a redundant re-render of the entire `ResultsView` tree just as it's mounting with new data.

**Action:** Wrapped `ResultsView` in `React.memo` to prevent this specific post-fetch re-render. Since `data` from `useQuery` is referentially stable, the memoized component skips the second render cycle, saving unnecessary font size recalculations.
