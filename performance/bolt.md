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

## 2026-02-12 - Serverless Function Caching for LLM Responses

**Learning:** Vercel Serverless Functions default to `Cache-Control: public, max-age=0, must-revalidate` (or similar) unless specified, meaning expensive LLM calls (OpenAI/OpenRouter) are re-executed for every identical request. Given that word definitions and connotations are effectively static, this is a significant waste of resources and latency.

**Action:** Added `Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600` to `lookup` and `connotation` API routes. This instructs Vercel's Edge Network to cache responses for 24 hours, serving instant responses for repeated queries and reducing LLM costs.
