import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { ConnotationResponseSchema } from "../src/lib/connotationSchema.js";
import {
  type OpenRouterCreateParams,
  handleLLMRequest,
} from "../src/server/openrouter.js";

const QuerySchema = z
  .object({
    headword: z.string().min(1).max(80),
    synonym: z.string().min(1).max(80),
    partOfSpeech: z.string().min(1).max(40),
    definition: z.string().min(1).max(400),
  })
  .strict();

const bilingualField = {
  type: "object",
  additionalProperties: false,
  properties: { en: { type: "string" }, zh: { type: "string" } },
  required: ["en"],
} as const;

const connotationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headword: { type: "string" },
    synonym: { type: "string" },
    partOfSpeech: { type: "string" },
    definition: { type: "string" },
    polarity: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
    register: { type: "string", enum: ["formal", "neutral", "informal"] },
    toneTags: { type: "array", minItems: 1, maxItems: 6, items: bilingualField },
    usageNote: bilingualField,
    cautions: { type: "array", maxItems: 4, items: bilingualField },
    example: bilingualField,
  },
  required: [
    "headword", "synonym", "partOfSpeech", "definition",
    "polarity", "register", "toneTags", "usageNote",
  ],
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleLLMRequest({
    req,
    res,
    label: "Connotation API",
    querySchema: QuerySchema,
    resultSchema: ConnotationResponseSchema,
    cacheControl: "public, s-maxage=86400, stale-while-revalidate=604800",
    buildParams: ({ headword, synonym, partOfSpeech, definition }, model): OpenRouterCreateParams => ({
      model,
      response_format: {
        type: "json_schema",
        json_schema: { name: "connotation", strict: true, schema: connotationSchema },
      },
      reasoning: { effort: "low", exclude: true },
      messages: [
        {
          role: "system",
          content:
            `You are a bilingual (English + Simplified Chinese) writing coach and lexicographer.\n` +
            `Task: Given a headword sense and ONE candidate synonym, produce compact connotation guidance to help a writer choose the best word.\n` +
            `Rules:\n` +
            `1) Keep it SHORT (UI tooltip). Prefer 1-2 sentences per field.\n` +
            `2) Provide natural Chinese; if unsure, omit "zh" for that field.\n` +
            `3) Return 2-5 toneTags. Return 0-3 cautions.\n`,
        },
        {
          role: "user",
          content:
            `Headword: ${headword}\n` +
            `Part of speech: ${partOfSpeech}\n` +
            `Sense definition: ${definition}\n` +
            `Candidate synonym: ${synonym}\n\n` +
            `Explain how "${synonym}" differs in connotation from other near-synonyms in THIS sense.`,
        },
      ],
      temperature: 0,
    }),
  });
}
