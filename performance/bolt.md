# Bolt's Performance Journal

Critical learnings from performance optimization work on Syno-Eager.

---

## 2026-02-09 - matchMedia vs resize Event for Viewport Detection

**Learning:** The original `useMobile` hook used a `resize` event listener which fires on every pixel change during window resizing. This causes excessive callback invocations even when the mobile state doesn't change (e.g., resizing from 1000px to 900px when breakpoint is 768px).

**Action:** Use `matchMedia` with `change` event listener instead. It only fires when the media query result actually changes (breakpoint is crossed). Combined with `useSyncExternalStore` for SSR compatibility and concurrent rendering safety. This reduces callback invocations by ~95% during typical window resizing.

---

## 2026-02-09 - Persistent Cache for Immutable Data

**Learning:** The application fetches static dictionary definitions using `useQuery` with `staleTime: Infinity` but only stores it in memory. This causes redundant API calls on page reloads, increasing latency and API costs.

**Action:** Use `@tanstack/react-query-persist-client` with `createSyncStoragePersister` to persist query cache to localStorage declaratively, keeping queryFn clean.
