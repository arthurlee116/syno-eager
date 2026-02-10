export type SynonymResponse = {
  word: string;
  phonetics?: string[];
  items: Array<{
    partOfSpeech: string;
    meanings: Array<{
      definition: string;
      example?: {
        en: string;
        zh?: string;
      };
      synonyms: Array<{
        en: string;
        zh?: string;
      }>;
    }>;
  }>;
};

export type ConnotationResponse = {
  headword: string;
  synonym: string;
  partOfSpeech: string;
  definition: string;
  polarity: "positive" | "negative" | "neutral" | "mixed";
  register: "formal" | "neutral" | "informal";
  toneTags: Array<{ en: string; zh?: string }>;
  usageNote: { en: string; zh?: string };
  cautions?: Array<{ en: string; zh?: string }>;
  example?: { en: string; zh?: string };
};
