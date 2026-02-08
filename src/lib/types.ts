import { z } from "zod";

export const MeaningSchema = z.object({
  definition: z.string(),
  example: z.string().optional(), // AI might miss it occasionally, safer to be optional but we prompt for it
  synonyms: z.array(z.string()),
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
