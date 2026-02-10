import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

export function ConnotationHovercard(props: ConnotationHovercardProps) {
  const { headword, partOfSpeech, definition, synonym, className } = props;
  const isMobile = useMobile();
  const contentId = useId();

  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<number | null>(null);

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
    };
  }, []);

  const scheduleOpen = () => {
    if (isMobile) return; // mobile uses tap
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpen(true), HOVER_INTENT_MS);
  };

  const cancelScheduledOpen = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  const close = useCallback(() => {
    cancelScheduledOpen();
    setOpen(false);
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
    if (!isMobile) return;
    setOpen((v) => !v);
  };

  const showPanel = open;

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseLeave={() => {
        if (!isMobile) close();
      }}
    >
      <button
        type="button"
        onMouseEnter={scheduleOpen}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!isMobile) close();
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

      {showPanel && (
        <div
          id={contentId}
          role="dialog"
          aria-label={`Connotation for ${synonym.en}`}
          onMouseEnter={() => {
            // If the user arrives here during hover-intent, keep it open.
            if (!isMobile) {
              cancelScheduledOpen();
              setOpen(true);
            }
          }}
          className={cn(
            "absolute z-50 mt-2 w-[min(420px,90vw)]",
            "left-0 top-full",
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
                onClick={() => setOpen(false)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Esc
              </button>
            </div>

            <div className="text-sm text-muted-foreground leading-snug line-clamp-3">{definition}</div>

            {isLoading || isFetching ? (
              <div className="space-y-2">
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
