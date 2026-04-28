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

## 2026-02-09 - Memoization of ResultsView for Post-Fetch Updates

**Learning:** The `App` component updates its search history state immediately after search results arrive. This triggers a full re-render of the `App` and its children, including the expensive `ResultsView`, even though the data hasn't changed.

**Action:** `ResultsView` is now wrapped in `React.memo` to prevent this redundant re-render. Additionally, expensive font size calculations are isolated in a memoized `DefinitionText` sub-component.
