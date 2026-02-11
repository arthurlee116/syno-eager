import type { VercelRequest, VercelResponse } from '@vercel/node';
import type OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';
import { SynonymResponseSchema } from '../src/lib/synonymSchema.js';
import { getOpenAIClient, storage } from './_openai.js';

function extractFirstJsonObject(raw: string): string | null {
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
  return raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  return storage.run({ capturedUpstreamErrorBody: '' }, async () => {
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
      const openai = getOpenAIClient();
      const model = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview';

      const response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'lookup',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              word: { type: 'string' },
              phonetics: { type: 'array', items: { type: 'string' } },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    partOfSpeech: { type: 'string' },
                    meanings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          definition: { type: 'string' },
                          example: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              en: { type: 'string' },
                              zh: { type: 'string' },
                            },
                            required: ['en'],
                          },
                          synonyms: {
                            type: 'array',
                            items: {
                              type: 'object',
                              additionalProperties: false,
                              properties: {
                                en: { type: 'string' },
                                zh: { type: 'string' },
                              },
                              required: ['en'],
                            },
                          },
                        },
                        required: ['definition', 'synonyms'],
                      },
                    },
                  },
                  required: ['partOfSpeech', 'meanings'],
                },
              },
            },
            required: ['word', 'items'],
          },
        },
      };

      const createParamsBase = {
        model,
        response_format: response_format as unknown,
        reasoning: { effort: 'low', exclude: true } as unknown,
        messages: [
          {
            role: "system",
            content: `You are a meticulous lexicographer. The user will provide a word. You must provide an EXHAUSTIVE, comprehensive analysis of this word.
1. Structure the JSON exactly as requested.
3. Include EVERY possible definition (common, rare, archaic, technical).
4. For EACH definition, provide a unique example sentence with Chinese translation.
5. For EACH definition, provide precise synonyms with Chinese translations.
6. Language: English -> English + Chinese (Simplified).
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
          "example": {
            "en": "string",
            "zh": "string"
          },
          "synonyms": [
            {
              "en": "string",
              "zh": "string"
            }
          ]
        }
      ]
    }
  ]
}
9. Provide natural, contextually appropriate Chinese translations.
10. If a Chinese translation cannot be determined, omit the "zh" field for that item.`
          },
          {
            role: "user",
            content: `Define the word: "${word}"`
          }
        ],
        temperature: 0,
      };

      // Type assertion as in original file
      const typedCreateParams = createParamsBase as unknown as Parameters<typeof openai.chat.completions.create>[0];

      const completion = await openai.chat.completions.create(
        typedCreateParams
      ) as OpenAI.Chat.Completions.ChatCompletion;

      const rawContent = completion.choices[0]?.message?.content || "";

      let parsedData;
      try {
        parsedData = JSON.parse(rawContent);
      } catch {
        console.warn("JSON Parse failed, attempting repair/extraction...");
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

      const validatedData = SynonymResponseSchema.parse(parsedData);

      return response.status(200).json(validatedData);

    } catch (error: unknown) {
      console.error("API Error:", error);
      if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 429) {
        response.setHeader('Retry-After', (error as { headers?: { 'retry-after'?: string } }).headers?.['retry-after'] || '60');
        return response.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
      }

      const errorObj = (typeof error === 'object' && error !== null) ? (error as Record<string, unknown>) : null;
      const statusValue = errorObj?.status;
      const status = typeof statusValue === 'number' ? statusValue : 500;

      let upstreamMessage: string | undefined;
      try {
        const inner = errorObj?.error;
        if (inner && typeof inner === 'object') {
          const msg = (inner as Record<string, unknown>).message;
          if (typeof msg === 'string' && msg.trim()) upstreamMessage = msg.trim();
        }
      } catch {
        // ignore
      }

      // Access capturedUpstreamErrorBody from storage
      const capturedUpstreamErrorBody = storage.getStore()?.capturedUpstreamErrorBody || '';

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
  });
}
