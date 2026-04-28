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

## 2026-02-09 - Memoizing Expensive List Renders

**Learning:** `ResultsView` re-renders when parent state (search history) updates, even if `data` is stable. This triggered re-renders for all `ConnotationHovercard` components (potentially dozens) and recalculated font sizes for every definition, causing unnecessary work.

**Action:** Applied `React.memo` to `ResultsView` and `ConnotationHovercard`. Extracted `DefinitionText` into a memoized component to isolate font size calculations. This ensures that list items and expensive computations only run when relevant props (like `isMobile` or `data`) actually change.
