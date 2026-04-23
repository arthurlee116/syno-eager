import { lazy, Suspense, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSynonymFetch } from '@/hooks/useSynonymFetch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { ResultsView } from '@/components/ResultsView';
import { cn } from '@/lib/utils';
import { Button } from '@/components/primitives/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlainTextCopy } from '@/hooks/usePlainTextCopy';
import { HistorySidebar } from '@/components/HistorySidebar';
import { History, Plus } from 'lucide-react';
import type { RecentSearchEntry } from '@/lib/recentSearches';

const DOCS_HASH = '#api-docs';
const ApiDocsView = lazy(() => import('@/components/ApiDocsView').then((module) => ({ default: module.ApiDocsView })));

function App() {
  usePlainTextCopy();
  const queryClient = useQueryClient();
  const [word, setWord] = useState<string | null>(null);
  const [hash, setHash] = useState<string>(() => (typeof window === 'undefined' ? '' : window.location.hash));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data, isLoading, error } = useSynonymFetch(word);
  const { history, addSearchFromResult, removeSearch, clearHistory } = useRecentSearches();

  useEffect(() => {
    if (data) {
      addSearchFromResult(data);
    }
  }, [data, addSearchFromResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSearch = (newWord: string) => {
    setWord(newWord);
  };

  const handleSelectHistory = (entry: RecentSearchEntry) => {
    setIsHistoryOpen(false);
    if (entry.result.items.length > 0) {
      queryClient.setQueryData(['lookup', entry.word], entry.result);
    }
    handleSearch(entry.word);
  };

  const resetToHome = () => {
    setWord(null);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  const hasResults = !!data && !error;
  const isApiDocsView = hash === DOCS_HASH;

  // Animation Variants
  const heroVariants = {
    centered: { y: "30vh", opacity: 1 },
    top: { y: 0, opacity: 1 }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5 } },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Background Grid - Subtle Swiss Touch */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" 
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Persistent Header / Logo Area */}
        <header className="absolute top-0 left-0 z-50 flex w-full items-center justify-between gap-4 p-6">
            <div 
                className="min-w-0 flex items-center gap-2 font-display text-lg font-bold tracking-tight cursor-pointer hover:text-primary transition-colors sm:text-xl"
                onClick={resetToHome}
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-foreground font-serif italic text-background">S</div>
                <span className="truncate">Syno-Eager</span>
            </div>
            {!isApiDocsView && (
              <div className="flex shrink-0 items-center gap-2">
                {hasResults && (
                  <Button
                    variant="outline"
                    aria-label="Start a new search"
                    onClick={resetToHome}
                    className="h-9 w-9 rounded-none border-border bg-background/80 p-0 text-foreground backdrop-blur-sm hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  aria-label="History"
                  onClick={() => setIsHistoryOpen(true)}
                  className="h-9 rounded-none border-border bg-background/80 px-3 py-0 text-xs uppercase tracking-[0.2em] backdrop-blur-sm sm:px-4 sm:tracking-[0.25em]"
                >
                  <History className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">History</span>
                  {history.length > 0 && <span className="font-mono text-[11px] text-muted-foreground">{history.length}</span>}
                </Button>
              </div>
            )}
        </header>

        {isApiDocsView ? (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-24">
                <p className="font-display text-xl tracking-[0.2em] uppercase text-muted-foreground">
                  Loading Docs
                </p>
              </div>
            }
          >
            <ApiDocsView />
          </Suspense>
        ) : (
          <>
            {/* Hero / Search Section */}
            <motion.div
                layout
                initial="centered"
                animate={hasResults ? "top" : "centered"}
                variants={heroVariants}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className={cn(
                    "w-full flex flex-col transition-all duration-500",
                    hasResults ? "pt-24 items-start" : "items-center"
                )}
            >
               <div className={cn("w-full space-y-8", hasResults ? "max-w-xl" : "max-w-2xl text-center")}>
                   <AnimatePresence mode="popLayout">
                    {!hasResults && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <h1 className="text-6xl md:text-8xl font-display font-semibold tracking-tighter leading-none">
                                Find the <span className="text-primary italic font-serif">perfect</span> word.
                            </h1>
                            <p className="text-muted-foreground text-xl max-w-lg mx-auto font-light">
                                One eager fetch. Infinite lexical depth.
                            </p>
                        </motion.div>
                    )}
                   </AnimatePresence>

                   <div className="w-full">
                     <SearchBar 
                        onSearch={handleSearch} 
                        isLoading={isLoading} 
                        variant={hasResults ? "top" : "centered"} 
                        initialValue={word || ''}
                     />
                   </div>

               </div>
            </motion.div>

            {/* Results Area */}
            <AnimatePresence mode="wait">
                {hasResults && (
                    <motion.div
                        key={data.word}
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full pb-20"
                    >
                        <ResultsView data={data} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            <AnimatePresence>
                {error && !isLoading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-background/90 z-40"
                    >
                        <div className="text-center space-y-6 max-w-md p-8 border-2 border-destructive/20 bg-destructive/5">
                            <div className="text-destructive font-display font-bold text-3xl">Err.</div>
                            <p className="text-muted-foreground font-mono text-sm">{error.message}</p>
                            <Button 
                                variant="outline" 
                                className="rounded-none border-destructive text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => setWord(null)}
                            >
                                Reset
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Full Screen Loading Overlay for Initial Fetch */}
            <AnimatePresence>
                {isLoading && !hasResults && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-24 h-24 border-8 border-muted border-t-primary rounded-full animate-spin" />
                            <p className="font-display text-xl tracking-widest uppercase animate-pulse">
                                Consulting Lexicon (5-10s)
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </>
        )}

        <footer className="mt-auto w-full pb-5 pt-10 text-center text-xs tracking-wide text-muted-foreground">
          {isApiDocsView ? (
            <a
              href="#"
              className="hover:text-primary transition-colors"
              onClick={resetToHome}
            >
              Back to Syno-Eager
            </a>
          ) : (
            <a href={DOCS_HASH} className="hover:text-primary transition-colors">
              API Documentation
            </a>
          )}
        </footer>

      </main>
      <HistorySidebar
        open={isHistoryOpen && !isApiDocsView}
        history={history}
        onOpenChange={setIsHistoryOpen}
        onSelect={handleSelectHistory}
        onRemove={removeSearch}
        onClearAll={clearHistory}
      />
    </div>
  );
}

export default App;
