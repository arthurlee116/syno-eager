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

