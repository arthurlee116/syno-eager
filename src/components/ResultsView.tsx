import type { SynonymResponse } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useMobile } from '@/hooks/useMobile';
import { getDynamicFontSize, getDefinitionFontSize } from '@/lib/typography';

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

export function ResultsView({ data }: ResultsViewProps) {
  const isMobile = useMobile();
  const defaultTab = data.items[0]?.partOfSpeech || 'all';

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
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent mb-12 border-b border-border rounded-none gap-8 overflow-x-auto">
          {data.items.map((item) => (
            <TabsTrigger
              key={item.partOfSpeech}
              value={item.partOfSpeech}
              className="px-0 py-4 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none capitalize text-xl font-display font-medium tracking-wide transition-all hover:text-primary/70"
            >
              {item.partOfSpeech}
            </TabsTrigger>
          ))}
        </TabsList>

        {data.items.map((item) => (
          <TabsContent key={item.partOfSpeech} value={item.partOfSpeech} className="focus:outline-none">
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
                            <Badge
                              key={`${syn.en}-${synIdx}`}
                              variant="outline"
                              className="text-lg px-5 py-2.5 rounded-none border-border font-sans font-medium text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 cursor-default"
                            >
                              <span>{syn.en}</span>
                              {syn.zh && (
                                <span className="ml-1.5" style={{ fontFamily: 'var(--font-sans-zh)', fontSize: '0.95em' }}>
                                  {syn.zh}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
