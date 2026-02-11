import type { VercelRequest, VercelResponse } from '@vercel/node';
import type OpenAI from 'openai';
import { z } from 'zod';
import { SynonymResponseSchema } from '../src/lib/synonymSchema.js';
import {
  type OpenRouterCreateParams,
  createOpenRouterClient,
  handleApiError,
  parseJsonFromLLM,
} from '../src/server/openrouter.js';

const QuerySchema = z.object({
  word: z.string().trim().min(1).max(80),
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Captured non-2xx upstream body for better error reporting.
  let capturedUpstreamErrorBody = '';

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const parsed = QuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return response.status(400).json({
      error: 'Invalid query parameters',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const { word } = parsed.data;

  if (!process.env.OPENROUTER_API_KEY) {
    return response.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
  }

  try {
    const openai = createOpenRouterClient({
      captureNon2xxBody: (body) => {
        capturedUpstreamErrorBody = body;
      },
    });

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview';

    const lookupSchema = {
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
    };

    const createParamsBase: OpenRouterCreateParams = {
      model,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'lookup',
          strict: true,
          schema: lookupSchema,
        },
      },
      reasoning: { effort: 'low', exclude: true },
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
      // Deterministic output for strict JSON parsing.
      temperature: 0,
    };

    const completion = await openai.chat.completions.create(
      createParamsBase as Parameters<typeof openai.chat.completions.create>[0]
    ) as OpenAI.Chat.Completions.ChatCompletion;

    const rawContent = completion.choices[0]?.message?.content || "";

    const parsedData = parseJsonFromLLM(rawContent, 'Lookup');

    // Validate with Zod
    const validatedData = SynonymResponseSchema.parse(parsedData);

    return response.status(200).json(validatedData);

  } catch (error: unknown) {
    return handleApiError(error, response, capturedUpstreamErrorBody, "Lookup API");
  }
}
