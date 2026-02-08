import { useState, useEffect } from 'react';
import { useSynonymFetch } from '@/hooks/useSynonymFetch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchBar } from '@/components/SearchBar';
import { ResultsView } from '@/components/ResultsView';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [word, setWord] = useState<string | null>(null);
  const { data, isLoading, error } = useSynonymFetch(word);
  const { history, addSearch, clearHistory } = useRecentSearches();

  useEffect(() => {
    if (data && word) {
      addSearch(data.word);
    }
  }, [data, word, addSearch]);

  const handleSearch = (newWord: string) => {
    setWord(newWord);
  };

  const hasResults = !!data;

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
        <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
            <div 
                className="flex items-center gap-2 font-display font-bold text-xl tracking-tight cursor-pointer hover:text-primary transition-colors"
                onClick={() => setWord(null)}
            >
                <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center rounded-none font-serif italic">S</div>
                <span>Syno-Eager</span>
            </div>
        </header>

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

               <AnimatePresence>
                {!hasResults && history.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4 pt-8"
                    >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                            <span>Recent Discoveries</span>
                            <button onClick={clearHistory} className="hover:text-primary transition-colors underline decoration-dotted">Clear</button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {history.map((h) => (
                            <button
                                key={h}
                                onClick={() => handleSearch(h)}
                                className="px-4 py-2 border border-border text-sm font-medium hover:border-primary hover:text-primary transition-all active:scale-95"
                            >
                                {h}
                            </button>
                            ))}
                        </div>
                    </motion.div>
                )}
               </AnimatePresence>
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

      </main>
    </div>
  );
}

export default App;
