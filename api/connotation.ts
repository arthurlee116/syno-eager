import type { VercelRequest, VercelResponse } from "@vercel/node";
import type OpenAI from "openai";
import { z } from "zod";
import { ConnotationResponseSchema } from "../src/lib/connotationSchema.js";
import {
  type OpenRouterCreateParams,
  createOpenRouterClient,
  handleApiError,
  parseJsonFromLLM,
} from "../src/server/openrouter.js";

const QuerySchema = z
  .object({
    headword: z.string().min(1).max(80),
    synonym: z.string().min(1).max(80),
    partOfSpeech: z.string().min(1).max(40),
    definition: z.string().min(1).max(400),
  })
  .strict();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let capturedUpstreamErrorBody = "";

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: Missing API Key" });
  }

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const { headword, synonym, partOfSpeech, definition } = parsed.data;

  try {
    const openai = createOpenRouterClient({
      captureNon2xxBody: (body) => {
        capturedUpstreamErrorBody = body;
      },
    });

    const model = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";

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
        toneTags: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              en: { type: "string" },
              zh: { type: "string" },
            },
            required: ["en"],
          },
        },
        usageNote: {
          type: "object",
          additionalProperties: false,
          properties: {
            en: { type: "string" },
            zh: { type: "string" },
          },
          required: ["en"],
        },
        cautions: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              en: { type: "string" },
              zh: { type: "string" },
            },
            required: ["en"],
          },
        },
        example: {
          type: "object",
          additionalProperties: false,
          properties: {
            en: { type: "string" },
            zh: { type: "string" },
          },
          required: ["en"],
        },
      },
      required: [
        "headword",
        "synonym",
        "partOfSpeech",
        "definition",
        "polarity",
        "register",
        "toneTags",
        "usageNote",
      ],
    };

    const completion = (await openai.chat.completions.create({
      model,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "connotation",
          strict: true,
          schema: connotationSchema,
        },
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
    } as OpenRouterCreateParams)) as OpenAI.Chat.Completions.ChatCompletion;

    const rawContent = completion.choices[0]?.message?.content || "";

    const parsedData = parseJsonFromLLM(rawContent, "Connotation");

    const validated = ConnotationResponseSchema.parse(parsedData);

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(validated);
  } catch (error: unknown) {
    return handleApiError(error, res, capturedUpstreamErrorBody, "Connotation API");
  }
}
