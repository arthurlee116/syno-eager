import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ZodType } from "zod";
import { ProxyAgent } from "undici";
import { jsonrepair } from "jsonrepair";
import { checkIpRateLimit, extractClientIp } from "./rateLimit";

/**
 * Extended create params for OpenRouter, which supports fields beyond the OpenAI SDK types.
 * This avoids `as unknown` casts scattered across API handlers.
 */
export type OpenRouterCreateParams = Parameters<typeof OpenAI.prototype.chat.completions.create>[0] & {
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
  reasoning?: {
    effort: "low" | "medium" | "high";
    exclude: boolean;
  };
};

export function extractFirstJsonObject(raw: string): string | null {
  // Some providers may prepend/append non-JSON traces. Extract the first balanced JSON object.
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

export function stripCodeFences(raw: string): string {
  // Best-effort removal in case the model wraps JSON in ``` fences.
  return raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
}

export function getProxyURL(): string | null {
  // If you need a local outbound proxy (e.g. Clash), set:
  //   OPENROUTER_PROXY_URL=http://127.0.0.1:10808
  // or use standard envs:
  //   HTTPS_PROXY / HTTP_PROXY
  return (
    process.env.OPENROUTER_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    null
  );
}

export function createOpenRouterClient(options: {
  captureNon2xxBody?: (body: string) => void;
}): OpenAI {
  const proxyURL = getProxyURL();
  const dispatcher = proxyURL ? new ProxyAgent(proxyURL) : undefined;

  const referer =
    process.env.OPENROUTER_SITE_URL || process.env.VERCEL_URL || "http://localhost";
  const title = process.env.OPENROUTER_APP_NAME || "Syno-Eager";

  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: "https://openrouter.ai/api/v1",
    fetchOptions: dispatcher ? ({ dispatcher } as Record<string, unknown>) : undefined,
    defaultHeaders: {
      "HTTP-Referer": referer,
      "X-Title": title,
    },
    // Capture non-OpenAI-shaped error bodies (some providers return different JSON).
    fetch: async (...args: Parameters<typeof fetch>) => {
      const res = await fetch(...args);
      if (!res.ok && options.captureNon2xxBody) {
        try {
          const text = await res.clone().text();
          // Avoid logging huge bodies; keep it small but useful.
          options.captureNon2xxBody(text.slice(0, 8_192));
        } catch {
          options.captureNon2xxBody("");
        }
      }
      return res;
    },
  });
}

export function parseJsonFromLLM(rawContent: string, contextLabel: string): unknown {
  try {
    return JSON.parse(rawContent);
  } catch {
    // Attempt repair/extraction for providers that wrap JSON in fences or add traces.
    try {
      const unfenced = stripCodeFences(rawContent);
      const extracted = extractFirstJsonObject(unfenced) ?? unfenced;
      const repaired = jsonrepair(extracted);
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error(`${contextLabel} JSON repair failed`, repairError);
      throw new Error("Failed to parse AI response");
    }
  }
}

export function getRetryAfterSecondsFrom429(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 429
  ) {
    return (error as { headers?: { "retry-after"?: string } }).headers?.["retry-after"] || "60";
  }
  return undefined;
}

export function getUpstreamStatus(error: unknown): number {
  const errorObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const statusValue = errorObj?.status;
  return typeof statusValue === "number" ? statusValue : 500;
}

export function getUpstreamMessage(error: unknown, capturedUpstreamErrorBody: string): string | undefined {
  const errorObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  try {
    const inner = errorObj?.error;
    if (inner && typeof inner === "object") {
      const msg = (inner as Record<string, unknown>).message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
  } catch {
    // ignore
  }

  if (capturedUpstreamErrorBody) {
    try {
      const parsedBody = JSON.parse(capturedUpstreamErrorBody);
      if (parsedBody && typeof parsedBody === "object") {
        const msg = (parsedBody as Record<string, unknown>).message;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

/**
 * Shared catch-block handler for API routes. Logs the error, detects 429/402 upstream
 * statuses, and writes a structured JSON error response.
 */
export function handleApiError(
  error: unknown,
  res: VercelResponse,
  capturedUpstreamErrorBody: string,
  label: string,
): void {
  console.error(`${label} Error:`, error);

  const retryAfter = getRetryAfterSecondsFrom429(error);
  if (retryAfter) {
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    return;
  }

  const status = getUpstreamStatus(error);
  const upstreamMessage = getUpstreamMessage(error, capturedUpstreamErrorBody);

  res.status(status).json({
    error:
      status === 402
        ? "Upstream billing/quota required. Please add billing or credits in your provider dashboard."
        : (error as Error).message || "Upstream API Error",
    upstream_status: status,
    upstream_message: upstreamMessage,
  });
}


/**
 * Shared wrapper that eliminates boilerplate across API handlers:
 * method check → query parse → API key check → LLM call → JSON parse → Zod validate → respond.
 */
export async function handleLLMRequest<TQuery, TResult>(options: {
  req: VercelRequest;
  res: VercelResponse;
  label: string;
  querySchema: ZodType<TQuery>;
  resultSchema: ZodType<TResult>;
  buildParams: (query: TQuery, model: string) => OpenRouterCreateParams;
}): Promise<void> {
  const { req, res, label, querySchema, resultSchema, buildParams } = options;
  let capturedUpstreamErrorBody = "";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const ip = extractClientIp(req);
  const rateLimit = checkIpRateLimit(ip);
  res.setHeader("X-RateLimit-Limit", String(rateLimit.limit));
  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.floor(rateLimit.resetAt / 1000)));

  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: "Rate limit exceeded. Max 20 requests per hour per IP." });
    return;
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query parameters",
      issues: (parsed.error as { issues: { path: (string | number)[]; message: string }[] }).issues.map(
        (i) => ({ path: i.path.join("."), message: i.message }),
      ),
    });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: "Server misconfiguration: Missing API Key" });
    return;
  }

  try {
    const openai = createOpenRouterClient({
      captureNon2xxBody: (body) => { capturedUpstreamErrorBody = body; },
    });

    const model = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";
    const createParams = buildParams(parsed.data, model);

    const completion = await openai.chat.completions.create(
      createParams as Parameters<typeof openai.chat.completions.create>[0],
    ) as OpenAI.Chat.Completions.ChatCompletion;

    const rawContent = completion.choices[0]?.message?.content || "";
    const parsedData = parseJsonFromLLM(rawContent, label);
    const validated = resultSchema.parse(parsedData);

    res.status(200).json(validated);
  } catch (error: unknown) {
    handleApiError(error, res, capturedUpstreamErrorBody, label);
  }
}
