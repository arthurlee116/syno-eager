import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useConnotationFetch } from "@/hooks/useConnotationFetch";
import { useMobile } from "@/hooks/useMobile";

type Synonym = { en: string; zh?: string };

type ConnotationHovercardProps = {
  headword: string;
  partOfSpeech: string;
  definition: string;
  synonym: Synonym;
  className?: string;
};

const HOVER_INTENT_MS = 200;
const PANEL_GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;

export function ConnotationHovercard(props: ConnotationHovercardProps) {
  const { headword, partOfSpeech, definition, synonym, className } = props;
  const isMobile = useMobile();
  const contentId = useId();

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const slowTimer = useRef<number | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const params = useMemo(
    () => ({
      headword,
      synonym: synonym.en,
      partOfSpeech,
      definition,
    }),
    [headword, synonym.en, partOfSpeech, definition]
  );

  const { data, isLoading, error, refetch, isFetching } = useConnotationFetch(params, open);

  const polarity = data?.polarity;
  const polarityLabel = (() => {
    if (!polarity) return { en: "neutral", zh: "中性" };
    switch (polarity) {
      case "positive":
        return { en: "positive", zh: "褒义" };
      case "negative":
        return { en: "negative", zh: "贬义" };
      case "mixed":
        return { en: "mixed", zh: "复杂" };
      default:
        return { en: "neutral", zh: "中性" };
    }
  })();

  const tint = (() => {
    // Use a subtle overlay so we don't rely on color alone; chips also carry text.
    switch (polarity) {
      case "positive":
        return {
          overlay: "bg-green-500/8",
          border: "border-green-500/30",
          chip: "bg-green-500/10 border-green-500/20",
        };
      case "negative":
        return {
          overlay: "bg-red-500/8",
          border: "border-red-500/30",
          chip: "bg-red-500/10 border-red-500/20",
        };
      case "mixed":
        return {
          overlay: "bg-slate-500/8",
          border: "border-slate-500/30",
          chip: "bg-slate-500/10 border-slate-500/20",
        };
      default:
        return {
          overlay: "bg-slate-500/8",
          border: "border-slate-500/30",
          chip: "bg-slate-500/10 border-slate-500/20",
        };
    }
  })();

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    };
  }, []);

  const scheduleOpen = () => {
    if (isMobile) return; // mobile uses tap
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHintVisible(true);
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
      setHintVisible(false);
    }, HOVER_INTENT_MS);
  };

  const cancelScheduledOpen = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  const close = useCallback(() => {
    cancelScheduledOpen();
    setOpen(false);
    setPinned(false);
    setHintVisible(false);
    setSlow(false);
  }, [cancelScheduledOpen]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isMobile, close]);

  const onTriggerClick = () => {
    if (isMobile) {
      if (open) close();
      else {
        setOpen(true);
        setHintVisible(false);
      }
      return;
    }

    // Desktop: click pins/unpins the card so the user can move the mouse and read.
    if (pinned) close();
    else {
      setPinned(true);
      setOpen(true);
      setHintVisible(false);
    }
  };

  const showPanel = open;

  useLayoutEffect(() => {
    if (!showPanel || !panelRef.current || !triggerRef.current) return;

    const panelEl = panelRef.current;
    const triggerEl = triggerRef.current;

    const reposition = () => {
      // Ensure we can measure size even before final positioning.
      panelEl.style.visibility = "hidden";
      panelEl.style.left = "0px";
      panelEl.style.top = "0px";

      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;

      const t = triggerEl.getBoundingClientRect();
      const p = panelEl.getBoundingClientRect();

      // If we can't measure (jsdom / hidden), just bail gracefully.
      if (!vw || !vh || (!p.width && !p.height)) {
        panelEl.style.visibility = "visible";
        return;
      }

      const roomBelow = vh - t.bottom - PANEL_GAP_PX - VIEWPORT_PADDING_PX;
      const roomAbove = t.top - PANEL_GAP_PX - VIEWPORT_PADDING_PX;

      const placeAbove = roomBelow < p.height && roomAbove >= p.height;

      let top = placeAbove
        ? t.top - PANEL_GAP_PX - p.height
        : t.bottom + PANEL_GAP_PX;

      // Start aligned to trigger's left edge.
      let left = t.left;

      // Clamp within viewport.
      left = Math.max(VIEWPORT_PADDING_PX, Math.min(left, vw - p.width - VIEWPORT_PADDING_PX));
      top = Math.max(VIEWPORT_PADDING_PX, Math.min(top, vh - p.height - VIEWPORT_PADDING_PX));

      panelEl.dataset.placement = placeAbove ? "top" : "bottom";
      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
      panelEl.style.visibility = "visible";
    };

    reposition();

    // Reposition on viewport changes while open.
    window.addEventListener("resize", reposition);
    // Scroll anywhere can move the trigger; use capture to catch nested scroll containers.
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [showPanel]);

  useEffect(() => {
    if (!open || !(isLoading || isFetching)) return;

    // If the model/provider is slow (or cold-starting), tell the user we're working.
    if (slowTimer.current) window.clearTimeout(slowTimer.current);
    slowTimer.current = window.setTimeout(() => setSlow(true), 1200);

    return () => {
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      slowTimer.current = null;
    };
  }, [open, isLoading, isFetching]);

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseLeave={() => {
        if (!isMobile && !pinned) close();
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        onMouseEnter={scheduleOpen}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!isMobile && !pinned) close();
        }}
        onClick={onTriggerClick}
        aria-haspopup="dialog"
        aria-expanded={showPanel}
        aria-controls={contentId}
        className={cn(
          "inline-flex items-center justify-center w-fit whitespace-nowrap",
          "border px-5 py-2.5 text-lg font-sans font-medium rounded-none",
          "transition-all duration-200",
          "border-border text-muted-foreground",
          // orange hover intent
          "hover:bg-orange-500 hover:text-white hover:border-orange-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isMobile ? "cursor-pointer" : "cursor-help"
        )}
      >
        <span>{synonym.en}</span>
        {synonym.zh && (
          <span className="ml-1.5" style={{ fontFamily: "var(--font-sans-zh)", fontSize: "0.95em" }}>
            {synonym.zh}
          </span>
        )}
      </button>

      {hintVisible && !showPanel && !isMobile && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "absolute z-50 -top-2 left-0 -translate-y-full",
            "px-3 py-2 w-[min(360px,90vw)]",
            "border border-orange-500/30 bg-background/95 backdrop-blur-sm",
            "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)]",
            "text-xs text-muted-foreground"
          )}
        >
          <div className="font-mono">Hover 0.2s to generate connotation…</div>
          <div style={{ fontFamily: "var(--font-sans-zh)" }}>悬停 0.2 秒后开始生成 connotation…</div>
        </div>
      )}

      {showPanel && (
        <div
          id={contentId}
          role="dialog"
          aria-label={`Connotation for ${synonym.en}`}
          ref={panelRef}
          onMouseEnter={() => {
            // If the user arrives here during hover-intent, keep it open.
            if (!isMobile) {
              cancelScheduledOpen();
              setOpen(true);
            }
          }}
          className={cn(
            // Fixed positioning avoids being clipped near the bottom of the page.
            "fixed z-50 w-[min(420px,90vw)]",
            "border bg-background/95 backdrop-blur-sm",
            tint.border,
            "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)]",
            "rounded-none"
          )}
        >
          <div className={cn("absolute inset-0 pointer-events-none", tint.overlay)} aria-hidden="true" />
          <div className="relative p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display font-semibold tracking-tight text-foreground">
                  {synonym.en}
                  {synonym.zh ? (
                    <span className="ml-2 text-muted-foreground" style={{ fontFamily: "var(--font-sans-zh)" }}>
                      {synonym.zh}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {partOfSpeech} · {headword}
                </div>
              </div>

              <button
                type="button"
                onClick={() => close()}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Esc
              </button>
            </div>

            <div className="text-sm text-muted-foreground leading-snug line-clamp-3">{definition}</div>

            {isLoading || isFetching ? (
              <div className="space-y-2">
                {slow ? (
                  <div className="space-y-1">
                    <div className="text-sm text-foreground">Generating connotation…</div>
                    <div className="text-xs font-mono text-muted-foreground">Typically 2-6 seconds.</div>
                    <div className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans-zh)" }}>
                      正在生成 connotation…（通常 2-6 秒）
                    </div>
                  </div>
                ) : null}
                <div className="h-4 w-3/4 bg-muted/40 animate-pulse" />
                <div className="h-4 w-2/3 bg-muted/30 animate-pulse" />
                <div className="h-3 w-1/2 bg-muted/20 animate-pulse" />
              </div>
            ) : error ? (
              <div className="space-y-2">
                <div className="text-sm text-destructive">{error.message}</div>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 underline decoration-dotted"
                >
                  Retry
                </button>
              </div>
            ) : data ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={cn("text-xs font-mono px-2 py-1 border", tint.chip)}>
                    polarity: {polarityLabel.en}
                    <span className="ml-1" style={{ fontFamily: "var(--font-sans-zh)" }}>
                      {polarityLabel.zh}
                    </span>
                  </span>
                  <span className={cn("text-xs font-mono px-2 py-1 border", tint.chip)}>
                    register: {data.register}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {data.toneTags.map((t, idx) => (
                    <span
                      key={`${t.en}-${idx}`}
                      className="text-xs px-2 py-1 border border-orange-500/30 text-foreground/80 bg-orange-500/5"
                    >
                      {t.en}
                      {t.zh ? (
                        <span className="ml-1" style={{ fontFamily: "var(--font-sans-zh)" }}>
                          {t.zh}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-foreground">{data.usageNote.en}</div>
                  {data.usageNote.zh ? (
                    <div className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans-zh)" }}>
                      {data.usageNote.zh}
                    </div>
                  ) : null}
                </div>

                {data.cautions && data.cautions.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-muted-foreground">cautions</div>
                    <ul className="space-y-1">
                      {data.cautions.map((c, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {c.en}
                          {c.zh ? (
                            <span className="ml-2" style={{ fontFamily: "var(--font-sans-zh)" }}>
                              {c.zh}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {data.example ? (
                  <div className="border-l-2 border-orange-500/30 pl-3 py-1 space-y-1">
                    <div className="text-sm text-muted-foreground">"{data.example.en}"</div>
                    {data.example.zh ? (
                      <div className="text-sm text-muted-foreground/80" style={{ fontFamily: "var(--font-sans-zh)" }}>
                        "{data.example.zh}"
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No connotation available.</div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
