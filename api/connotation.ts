import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { z } from "zod";
import { ConnotationResponseSchema } from "../src/lib/connotationSchema.js";
import {
  createOpenRouterClient,
  getRetryAfterSecondsFrom429,
  getUpstreamMessage,
  getUpstreamStatus,
  parseJsonFromLLM,
} from "../src/server/openrouter.js";

const QuerySchema = z.object({
  headword: z.string().min(1).max(80),
  synonym: z.string().min(1).max(80),
  partOfSpeech: z.string().min(1).max(40),
  definition: z.string().min(1).max(400),
});

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

    const response_format = {
      type: "json_schema",
      json_schema: {
        name: "connotation",
        strict: true,
        schema: {
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
        },
      },
    };

    const completion = (await openai.chat.completions.create({
      model,
      // OpenRouter Structured Outputs (JSON Schema). Forces the model to emit schema-valid JSON.
      // See: https://openrouter.ai/docs/guides/features/structured-outputs
      response_format: response_format as unknown,
      // OpenRouter Reasoning Tokens. For Gemini 3, effort maps to thinkingLevel.
      // Exclude returned reasoning to keep the JSON content clean.
      reasoning: { effort: "low", exclude: true } as unknown,
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
    })) as OpenAI.Chat.Completions.ChatCompletion;

    const rawContent = completion.choices[0]?.message?.content || "";

    const parsedData = parseJsonFromLLM(rawContent, "Connotation");

    const validated = ConnotationResponseSchema.parse(parsedData);
    return res.status(200).json(validated);
  } catch (error: unknown) {
    console.error("Connotation API Error:", error);

    const retryAfter = getRetryAfterSecondsFrom429(error);
    if (retryAfter) {
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    const status = getUpstreamStatus(error);
    const upstreamMessage = getUpstreamMessage(error, capturedUpstreamErrorBody);

    return res.status(status).json({
      error:
        status === 402
          ? "Upstream billing/quota required. Please add billing or credits in your provider dashboard."
          : (error as Error).message || "Upstream API Error",
      upstream_status: status,
      upstream_message: upstreamMessage,
    });
  }
}
