import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { useConnotationFetch } from "@/hooks/useConnotationFetch";

type Synonym = { en: string; zh?: string };

type ConnotationHovercardProps = {
  headword: string;
  partOfSpeech: string;
  definition: string;
  synonym: Synonym;
  className?: string;
};

const PANEL_GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;
const OPEN_DELAY = 200;
const CLOSE_DELAY = 120;

/**
 * Performance: Memoized to prevent re-rendering all hovercards when the parent
 * ResultsView re-renders for unrelated reasons (e.g. viewport size changes).
 */
export const ConnotationHovercard = memo(function ConnotationHovercard(props: ConnotationHovercardProps) {
  const { headword, partOfSpeech, definition, synonym, className } = props;
  const contentId = useId();

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const slowTimer = useRef<number | null>(null);

  const clearTimer = (ref: React.RefObject<number | null>) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = null;
  };

  const close = useCallback(() => {
    clearTimer(hoverTimer);
    clearTimer(closeTimer);
    clearTimer(slowTimer);
    setOpen(false);
    setPinned(false);
    setHintVisible(false);
    setSlow(false);
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimer(hoverTimer);
    clearTimer(closeTimer);
    setHintVisible(true);
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
      setHintVisible(false);
    }, OPEN_DELAY);
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    clearTimer(closeTimer);
    closeTimer.current = window.setTimeout(() => close(), CLOSE_DELAY);
  }, [pinned, close]);

  useEffect(() => {
    return () => {
      clearTimer(hoverTimer);
      clearTimer(closeTimer);
      clearTimer(slowTimer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const handleTriggerClick = () => {
    if (pinned) close();
    else {
      setPinned(true);
      setOpen(true);
      setHintVisible(false);
    }
  };

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
      default:
        return {
          overlay: "bg-slate-500/8",
          border: "border-slate-500/30",
          chip: "bg-slate-500/10 border-slate-500/20",
        };
    }
  })();

  useEffect(() => {
    if (!open || !(isLoading || isFetching)) return;

    // If the model/provider is slow (or cold-starting), tell the user we're working.
    clearTimer(slowTimer);
    slowTimer.current = window.setTimeout(() => setSlow(true), 1200);

    return () => clearTimer(slowTimer);
  }, [open, isLoading, isFetching]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else setOpen(true);
      }}
      modal={false}
    >
      <span className={cn("relative inline-block", className)}>
        <Popover.Anchor asChild>
          <button
            type="button"
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
            onClick={handleTriggerClick}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={contentId}
            className={cn(
              "inline-flex items-center justify-center w-fit whitespace-nowrap",
              "border px-5 py-2.5 text-lg font-sans font-medium rounded-none",
              "transition-all duration-200",
              "border-border text-muted-foreground",
              "hover:bg-orange-500 hover:text-white hover:border-orange-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "cursor-pointer md:cursor-help"
            )}
          >
            <span>{synonym.en}</span>
            {synonym.zh && (
              <span
                className="ml-1.5"
                style={{ fontFamily: "var(--font-sans-zh)", fontSize: "0.95em" }}
              >
                {synonym.zh}
              </span>
            )}
          </button>
        </Popover.Anchor>

        {hintVisible && !open && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "absolute z-50 -top-2 left-0 -translate-y-full",
              "px-3 py-2 w-[min(360px,90vw)]",
              "border border-orange-500/30 bg-background/95 backdrop-blur-sm",
              "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.55)]",
              "text-xs text-muted-foreground",
              "max-md:hidden"
            )}
          >
            <div className="font-mono">Hover 0.2s to generate connotation…</div>
            <div style={{ fontFamily: "var(--font-sans-zh)" }}>悬停 0.2 秒后开始生成 connotation…</div>
          </div>
        )}
      </span>

      {open && (
        <Popover.Portal>
          <Popover.Content
            id={contentId}
            role="dialog"
            aria-label={`Connotation for ${synonym.en}`}
            side="bottom"
            align="start"
            sideOffset={PANEL_GAP_PX}
            collisionPadding={VIEWPORT_PADDING_PX}
            style={{ maxHeight: "min(520px, calc(100vh - 32px))" }}
            onMouseEnter={() => {
              clearTimer(hoverTimer);
              clearTimer(closeTimer);
              setOpen(true);
            }}
            onMouseLeave={() => {
              if (!pinned) scheduleClose();
            }}
            className={cn(
              "z-50 w-[min(420px,90vw)] overflow-y-auto",
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
                      <span
                        className="ml-2 text-muted-foreground"
                        style={{ fontFamily: "var(--font-sans-zh)" }}
                      >
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

              <div className="text-xs font-mono text-muted-foreground">
                Tip: Scroll inside this card. Click the synonym to pin.
              </div>

              <div className="text-sm text-muted-foreground leading-snug line-clamp-3">{definition}</div>

              {isLoading || isFetching ? (
                <div className="space-y-2">
                  {slow ? (
                    <div className="space-y-1">
                      <div className="text-sm text-foreground">Generating connotation…</div>
                      <div className="text-xs font-mono text-muted-foreground">Typically 2-6 seconds.</div>
                      <div
                        className="text-sm text-muted-foreground"
                        style={{ fontFamily: "var(--font-sans-zh)" }}
                      >
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
                <div className="space-y-3 overscroll-contain">
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
                        <div
                          className="text-sm text-muted-foreground/80"
                          style={{ fontFamily: "var(--font-sans-zh)" }}
                        >
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
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
});
