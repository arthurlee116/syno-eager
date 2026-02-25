import { z } from 'zod';
import { ProxyAgent } from 'undici';
import { jsonrepair } from 'jsonrepair';
import OpenAI from 'openai';

// Inline schemas
const MeaningSchema = z.object({
  definition: z.string(),
  example: z.string().optional(),
  synonyms: z.array(z.string()),
});

const ItemSchema = z.object({
  partOfSpeech: z.string(),
  meanings: z.array(MeaningSchema),
});

const SynonymResponseSchema = z.object({
  word: z.string(),
  phonetics: z.array(z.string()).optional(),
  items: z.array(ItemSchema),
});

function extractFirstJsonObject(raw) {
  const s = raw.trim();
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

function stripCodeFences(raw) {
  return raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
}

function getProxyURL() {
  return process.env.OPENROUTER_PROXY_URL || 
         process.env.HTTPS_PROXY || 
         process.env.HTTP_PROXY || 
         process.env.https_proxy || 
         process.env.http_proxy || null;
}

export default async function handler(request, response) {
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
      fetchOptions: dispatcher ? { dispatcher } : undefined,
      defaultHeaders: {
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      fetch: async (...args) => {
        const res = await fetch(...args);
        if (!res.ok) {
          try {
            const text = await res.clone().text();
            capturedUpstreamErrorBody = text.slice(0, 8192);
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
        { role: "system", content: `You are a meticulous lexicographer. Output strictly valid JSON with word, phonetics, items (partOfSpeech, meanings with definition, example, synonyms).` },
        { role: "user", content: `Define the word: "${word}"` }
      ],
      temperature: 0,
    };

    const createParams = {
      ...createParamsBase,
      provider: { only: ['cerebras'], allow_fallbacks: false },
    };

    const completion = await openai.chat.completions.create(createParams);
    const rawContent = completion.choices[0]?.message?.content || "";

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      try {
        const unfenced = stripCodeFences(rawContent);
        const extracted = extractFirstJsonObject(unfenced) ?? unfenced;
        const repaired = jsonrepair(extracted);
        parsedData = JSON.parse(repaired);
      } catch (repairError) {
        throw new Error("Failed to parse AI response");
      }
    }

    const validatedData = SynonymResponseSchema.parse(parsedData);
    return response.status(200).json(validatedData);

  } catch (error) {
    console.error("API Error:", error);
    if (error.status === 429) {
      response.setHeader('Retry-After', error.headers?.['retry-after'] || '60');
      return response.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
    }

    const status = error.status || 500;
    let upstreamMessage;
    if (capturedUpstreamErrorBody) {
      try {
        const parsed = JSON.parse(capturedUpstreamErrorBody);
        upstreamMessage = parsed.message;
      } catch {}
    }

    return response.status(status).json({
      error: error.message || 'Upstream API Error',
      upstream_status: status,
      upstream_message: upstreamMessage,
      upstream_body: capturedUpstreamErrorBody || undefined,
    });
  }
}
