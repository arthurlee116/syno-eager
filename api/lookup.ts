import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { ProxyAgent } from 'undici';
import { jsonrepair } from 'jsonrepair';
import { SynonymResponseSchema } from '../src/lib/types.js';

function extractFirstJsonObject(raw: string): string | null {
  // GLM 4.7 is a reasoning-capable model; some providers may prepend/append
  // non-JSON traces. This extracts the first balanced JSON object from text.
  const s = raw.trim();
  const start = s.indexOf('{');
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
      if (ch === '\\') {
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

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) return s.slice(start, i + 1);
  }

  return null;
}

function stripCodeFences(raw: string): string {
  // Best-effort removal in case the model wraps JSON in ``` fences.
  return raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
}

function getProxyURL(): string | null {
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

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Captured non-2xx upstream body for better error reporting.
  let capturedUpstreamErrorBody = '';

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { word } = request.query;

  if (!word || typeof word !== 'string') {
    return response.status(400).json({ error: 'Word parameter is required' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return response.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
  }

  try {
    const proxyURL = getProxyURL();
    const dispatcher = proxyURL ? new ProxyAgent(proxyURL) : undefined;

    const referer = process.env.OPENROUTER_SITE_URL || process.env.VERCEL_URL || 'http://localhost';
    const title = process.env.OPENROUTER_APP_NAME || 'Syno-Eager';

    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      fetchOptions: dispatcher ? ({ dispatcher } as Record<string, unknown>) : undefined,
      defaultHeaders: {
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      // Capture non-OpenAI-shaped error bodies (Cerebras sometimes returns {message,type,...}).
      fetch: async (...args: Parameters<typeof fetch>) => {
        const res = await fetch(...args);
        if (!res.ok) {
          try {
            const text = await res.clone().text();
            // Avoid logging huge bodies; keep it small but useful.
            capturedUpstreamErrorBody = text.slice(0, 8_192);
          } catch {
            capturedUpstreamErrorBody = '';
          }
        }
        return res;
      },
    });

    const model = process.env.OPENROUTER_MODEL || 'z-ai/glm-4.7';
    const createParamsBase = {
      model,
      messages: [
        {
          role: "system",
          content: `You are a meticulous lexicographer. The user will provide a word. You must provide an EXHAUSTIVE, comprehensive analysis of this word.
1. Output strictly valid JSON.
2. Structure the JSON exactly as requested.
3. Include EVERY possible definition (common, rare, archaic, technical).
4. For EACH definition, provide a unique example sentence.
5. For EACH definition, provide precise synonyms.
6. Language: English -> English.
7. Do not wrap in Markdown code blocks, just raw JSON.
8. Schema:
{
  "word": "string",
  "phonetics": ["string"],
  "items": [
    {
      "partOfSpeech": "noun|verb|etc",
      "meanings": [
        {
          "definition": "string",
          "example": "string",
          "synonyms": ["string"]
        }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: `Define the word: "${word}"`
        }
      ],
      // Deterministic output for strict JSON parsing.
      temperature: 0,
    };

    // Force OpenRouter to route this request to Cerebras.
    // See: https://openrouter.ai/docs/guides/routing/provider-selection
    const createParams = {
      ...createParamsBase,
      provider: {
        only: ['cerebras'],
        allow_fallbacks: false,
      },
    };

    const typedCreateParams = createParams as unknown as Parameters<typeof openai.chat.completions.create>[0];

    const completion = await openai.chat.completions.create(typedCreateParams) as OpenAI.Chat.Completions.ChatCompletion;

    const rawContent = completion.choices[0]?.message?.content || "";

    // Attempt repair and parse
    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      console.log("JSON Parse failed, attempting repair/extraction...");
      try {
        const unfenced = stripCodeFences(rawContent);
        const extracted = extractFirstJsonObject(unfenced) ?? unfenced;
        const repaired = jsonrepair(extracted);
        parsedData = JSON.parse(repaired);
      } catch (repairError) {
        console.error("JSON Repair failed", repairError);
        throw new Error("Failed to parse AI response");
      }
    }

    // Validate with Zod
    const validatedData = SynonymResponseSchema.parse(parsedData);

    return response.status(200).json(validatedData);

  } catch (error: unknown) {
    console.error("API Error:", error);
    if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) {
      response.setHeader('Retry-After', (error as { headers?: { 'retry-after'?: string } }).headers?.['retry-after'] || '60');
      return response.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
    }

    // Prefer forwarding upstream HTTP status (e.g. 402 payment_required) so the client can display
    // a correct message instead of a generic "parse failed".
    const errorObj = (typeof error === 'object' && error !== null) ? (error as Record<string, unknown>) : null;
    const statusValue = errorObj?.status;
    const status = typeof statusValue === 'number' ? statusValue : 500;

    let upstreamMessage: string | undefined;
    // The OpenAI SDK's APIError sometimes can't parse non-OpenAI-shaped JSON bodies.
    // If our fetch wrapper captured something, try to extract a message from it.
    try {
      const inner = errorObj?.error;
      if (inner && typeof inner === 'object') {
        const msg = (inner as Record<string, unknown>).message;
        if (typeof msg === 'string' && msg.trim()) upstreamMessage = msg.trim();
      }
    } catch {
      // ignore
    }

    // If we have a captured body, try to derive a helpful message from it.
    if (!upstreamMessage && capturedUpstreamErrorBody) {
      try {
        const parsed = JSON.parse(capturedUpstreamErrorBody);
        if (parsed && typeof parsed === 'object') {
          const msg = (parsed as Record<string, unknown>).message;
          if (typeof msg === 'string') upstreamMessage = msg;
        }
      } catch {
        // ignore
      }
    }

    return response.status(status).json({
      error:
        status === 402
          ? 'Cerebras billing/quota required. Please add billing or credits in your Cerebras dashboard.'
          : (error as Error).message || 'Upstream API Error',
      upstream_status: status,
      upstream_message: upstreamMessage,
      upstream_body: capturedUpstreamErrorBody || undefined,
      details: String(error),
    });
  }
}
