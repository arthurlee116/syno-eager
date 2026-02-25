import type { SynonymResponse } from '@/lib/synonymSchema';
import { Card, CardContent } from '@/components/primitives/Card';
import { motion } from 'framer-motion';
import { useMobile } from '@/hooks/useMobile';
import { getDynamicFontSize, getDefinitionFontSize } from '@/lib/typography';
import { useMemo, useState, memo } from 'react';
import { ConnotationHovercard } from '@/components/ConnotationHovercard';

interface ResultsViewProps {
  data: SynonymResponse;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

/**
 * ResultsView displays the search results.
 *
 * Performance Optimization:
 * Wrapped in React.memo to prevent unnecessary re-renders when the parent App component
 * updates (e.g., when updating search history in localStorage) while the synonym data
 * remains referentially stable. This saves expensive typography calculations and list reconciliation.
 */
export const ResultsView = memo(function ResultsView({ data }: ResultsViewProps) {
  const isMobile = useMobile();
  const tabs = useMemo(() => data.items.map((i) => i.partOfSpeech), [data.items]);
  const tabIds = useMemo(
    () =>
      data.items.map((item, index) => {
        const slug = item.partOfSpeech
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return `tab-${index}-${slug || 'pos'}`;
      }),
    [data.items],
  );
  const [activeTab, setActiveTab] = useState(() => tabs[0] ?? 'all');

  const safeActiveTab = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? 'all');

  const headerFontSize = getDynamicFontSize(data.word, isMobile);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12">
      {/* Header: Swiss Typography - Big & Bold */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6 pt-12 border-b-2 border-primary/10 pb-12"
      >
        <div className="flex flex-col md:flex-row md:items-baseline md:gap-6">
          <h1
            className="text-7xl md:text-9xl font-display font-semibold tracking-tighter text-foreground leading-none"
            style={headerFontSize ? { fontSize: headerFontSize } : {}}
          >
            {data.word}
          </h1>
          {data.phonetics && data.phonetics.length > 0 && (
            <div className="flex flex-wrap gap-3 font-mono text-muted-foreground text-lg pt-2 md:pt-0">
              {data.phonetics.map((p, i) => (
                <span key={i} className="">/{p}/</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div className="w-full">
        <div
          role="tablist"
          aria-label="Parts of speech"
          className="w-full flex justify-start h-auto p-0 bg-transparent mb-12 border-b border-border rounded-none gap-8 overflow-x-auto"
        >
          {data.items.map((item, index) => {
            const isActive = item.partOfSpeech === safeActiveTab;
            const tabId = tabIds[index] ?? `tab-${index}-pos`;
            const panelId = `tabpanel-${tabId}`;
            return (
              <button
                key={item.partOfSpeech}
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                className={[
                  "px-0 py-4 rounded-none border-b-2 border-transparent capitalize text-xl font-display font-medium tracking-wide transition-all hover:text-primary/70",
                  isActive ? "border-primary text-primary" : "text-foreground/60",
                ].join(" ")}
                onClick={() => setActiveTab(item.partOfSpeech)}
              >
                {item.partOfSpeech}
              </button>
            );
          })}
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground font-mono">
            Tip: Hover over a synonym to see connotation notes.
          </p>
        </div>

        {data.items.map((item, index) => {
          if (item.partOfSpeech !== safeActiveTab) return null;
          const tabId = tabIds[index] ?? `tab-${index}-pos`;
          const panelId = `tabpanel-${tabId}`;
          return (
            <div key={item.partOfSpeech} role="tabpanel" id={panelId} aria-labelledby={tabId} className="focus:outline-none">
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-4"
              >
                {item.meanings.map((meaning, idx) => (
                  <motion.div variants={itemAnim} key={idx}>
                    <Card className="group border border-border bg-card hover:border-primary/50 transition-colors duration-300 shadow-none rounded-none">
                      <CardContent className="p-8 space-y-6">
                        <div className="flex gap-6 items-baseline">
                          <span className="font-mono text-primary/40 text-sm">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <div className="space-y-3 flex-1">
                            <p
                              className="text-2xl md:text-3xl font-display font-medium text-foreground leading-snug"
                              style={isMobile ? { fontSize: getDefinitionFontSize(meaning.definition, true) } : {}}
                            >
                              {meaning.definition}
                            </p>
                            {meaning.example && (
                              <div className="border-l-2 border-primary/20 pl-4 py-1 space-y-1">
                                <p className="text-muted-foreground font-sans text-lg">
                                  "{meaning.example.en}"
                                </p>
                                {meaning.example.zh && (
                                  <p className="text-muted-foreground/70 text-base" style={{ fontFamily: 'var(--font-sans-zh)' }}>
                                    "{meaning.example.zh}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {meaning.synonyms.length > 0 && (
                          <div className="pl-12 pt-2 flex flex-wrap gap-2">
                            {meaning.synonyms.map((syn, synIdx) => (
                              <ConnotationHovercard
                                key={`${syn.en}-${synIdx}`}
                                headword={data.word}
                                partOfSpeech={item.partOfSpeech}
                                definition={meaning.definition}
                                synonym={syn}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
