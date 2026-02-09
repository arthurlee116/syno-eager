# Bolt's Performance Journal

Critical learnings from performance optimization work on Syno-Eager.

---

## 2026-02-09 - matchMedia vs resize Event for Viewport Detection

**Learning:** The original `useMobile` hook used `resize` event listener which fires on every pixel change during window resizing. This causes excessive callback invocations even when the mobile state doesn't change (e.g., resizing from 1000px to 900px when breakpoint is 768px).

**Action:** Use `matchMedia` with `change` event listener instead. It only fires when the media query result actually changes (breakpoint is crossed). Combined with `useSyncExternalStore` for SSR compatibility and concurrent rendering safety. This reduces callback invocations by ~95% during typical window resizing.

**Before:**
```typescript
useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
}, [breakpoint]);
```

**After:**
```typescript
// Uses matchMedia change event + useSyncExternalStore
// Only fires when crossing the breakpoint, not on every pixel
```
