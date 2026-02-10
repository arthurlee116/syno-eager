import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { ProxyAgent } from "undici";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import { ConnotationResponseSchema } from "../src/lib/connotationSchema.js";

function extractFirstJsonObject(raw: string): string | null {
  const s = raw.trim();
  const start = s.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return s.slice(start, i + 1);
  }

  return null;
}

function stripCodeFences(raw: string): string {
  return raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
}

function getProxyURL(): string | null {
  return (
    process.env.OPENROUTER_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    null
  );
}

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
    const proxyURL = getProxyURL();
    const dispatcher = proxyURL ? new ProxyAgent(proxyURL) : undefined;

    const referer = process.env.OPENROUTER_SITE_URL || process.env.VERCEL_URL || "http://localhost";
    const title = process.env.OPENROUTER_APP_NAME || "Syno-Eager";

    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      fetchOptions: dispatcher ? ({ dispatcher } as Record<string, unknown>) : undefined,
      defaultHeaders: {
        "HTTP-Referer": referer,
        "X-Title": title,
      },
      fetch: async (...args: Parameters<typeof fetch>) => {
        const r = await fetch(...args);
        if (!r.ok) {
          try {
            const text = await r.clone().text();
            capturedUpstreamErrorBody = text.slice(0, 8_192);
          } catch {
            capturedUpstreamErrorBody = "";
          }
        }
        return r;
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

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      try {
        const unfenced = stripCodeFences(rawContent);
        const extracted = extractFirstJsonObject(unfenced) ?? unfenced;
        const repaired = jsonrepair(extracted);
        parsedData = JSON.parse(repaired);
      } catch (repairError) {
        console.error("Connotation JSON repair failed", repairError);
        throw new Error("Failed to parse AI response");
      }
    }

    const validated = ConnotationResponseSchema.parse(parsedData);
    return res.status(200).json(validated);
  } catch (error: unknown) {
    console.error("Connotation API Error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 429
    ) {
      res.setHeader(
        "Retry-After",
        (error as { headers?: { "retry-after"?: string } }).headers?.["retry-after"] || "60"
      );
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    const errorObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
    const statusValue = errorObj?.status;
    const status = typeof statusValue === "number" ? statusValue : 500;

    let upstreamMessage: string | undefined;
    try {
      const inner = errorObj?.error;
      if (inner && typeof inner === "object") {
        const msg = (inner as Record<string, unknown>).message;
        if (typeof msg === "string" && msg.trim()) upstreamMessage = msg.trim();
      }
    } catch {
      // ignore
    }

    if (!upstreamMessage && capturedUpstreamErrorBody) {
      try {
        const parsedBody = JSON.parse(capturedUpstreamErrorBody);
        if (parsedBody && typeof parsedBody === "object") {
          const msg = (parsedBody as Record<string, unknown>).message;
          if (typeof msg === "string") upstreamMessage = msg;
        }
      } catch {
        // ignore
      }
    }

    return res.status(status).json({
      error:
        status === 402
          ? "Upstream billing/quota required. Please add billing or credits in your provider dashboard."
          : (error as Error).message || "Upstream API Error",
      upstream_status: status,
      upstream_message: upstreamMessage,
      upstream_body: capturedUpstreamErrorBody || undefined,
      details: String(error),
    });
  }
}
