import { z } from "zod";

export const MeaningSchema = z.object({
  definition: z.string(),
  example: z.object({
    en: z.string(),
    zh: z.string().optional(),
  }).optional(),
  synonyms: z.array(z.object({
    en: z.string(),
    zh: z.string().optional(),
  })),
});

export const ItemSchema = z.object({
  partOfSpeech: z.string(),
  meanings: z.array(MeaningSchema),
});

export const SynonymResponseSchema = z.object({
  word: z.string(),
  phonetics: z.array(z.string()).optional(),
  items: z.array(ItemSchema),
});

export type SynonymResponse = z.infer<typeof SynonymResponseSchema>;
