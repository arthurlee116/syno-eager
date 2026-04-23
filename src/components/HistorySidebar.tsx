import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Trash2, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/utils';
import type { RecentSearchEntry } from '@/lib/recentSearches';
import { formatRecentSearchTime } from '@/lib/recentSearches';

interface HistorySidebarProps {
  open: boolean;
  history: RecentSearchEntry[];
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: RecentSearchEntry) => void;
  onRemove: (word: string) => void;
  onClearAll: () => void;
}

export function HistorySidebar({
  open,
  history,
  onOpenChange,
  onSelect,
  onRemove,
  onClearAll,
}: HistorySidebarProps) {
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.dataset.historyOverflow = previousOverflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = document.body.dataset.historyOverflow ?? '';
        delete document.body.dataset.historyOverflow;
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close history sidebar"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-sidebar-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>Search History</span>
                </div>
                <div>
                  <h2 id="history-sidebar-title" className="font-display text-3xl font-semibold tracking-tight">
                    All discoveries
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {history.length === 0 ? 'No saved searches yet.' : `${history.length} saved search${history.length === 1 ? '' : 'es'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  onClick={onClearAll}
                  disabled={history.length === 0}
                  className="rounded-none border-border px-3 py-2 text-xs uppercase tracking-[0.2em]"
                >
                  Clear all
                </Button>
                <Button
                  variant="outline"
                  aria-label="Close history"
                  onClick={() => onOpenChange(false)}
                  className="rounded-none border-border p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {history.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 border border-dashed border-border px-8 text-center">
                  <History className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="font-display text-2xl tracking-tight">History will appear here</p>
                    <p className="text-sm text-muted-foreground">
                      Search for a word, and we&apos;ll keep the full record in this sidebar.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li key={entry.word}>
                      <div className="group flex items-stretch gap-2">
                        <button
                          type="button"
                          onClick={() => onSelect(entry)}
                          className={cn(
                            'min-w-0 flex-1 border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary hover:bg-accent/40',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          )}
                        >
                          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0 space-y-2">
                              <div className="break-words font-display text-2xl font-medium tracking-tight text-foreground">
                                {entry.word}
                              </div>
                              <div className="text-sm text-muted-foreground">{entry.summary || 'Saved search'}</div>
                            </div>
                            <time className="shrink-0 self-start pt-1 text-left font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-right">
                              {formatRecentSearchTime(entry.queriedAt)}
                            </time>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          aria-label={`Remove ${entry.word} from history`}
                          className="min-h-20 w-12 shrink-0 rounded-none border-border p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(entry.word)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
