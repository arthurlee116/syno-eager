import { z } from "zod";

const BilingualTextSchema = z.object({
  en: z.string(),
  zh: z.string().optional(),
});

export const ConnotationResponseSchema = z.object({
  headword: z.string(),
  synonym: z.string(),
  partOfSpeech: z.string(),
  definition: z.string(),

  polarity: z.enum(["positive", "negative", "neutral", "mixed"]),
  register: z.enum(["formal", "neutral", "informal"]),

  toneTags: z.array(BilingualTextSchema).min(1).max(6),
  usageNote: BilingualTextSchema,

  cautions: z.array(BilingualTextSchema).max(4).optional(),
  example: BilingualTextSchema.optional(),
});

export type ConnotationResponse = z.infer<typeof ConnotationResponseSchema>;

