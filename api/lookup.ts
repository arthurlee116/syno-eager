import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { SynonymResponseSchema } from '../src/lib/synonymSchema.js';
import {
  type OpenRouterCreateParams,
  handleLLMRequest,
} from '../src/server/openrouter.js';

const QuerySchema = z
  .object({
    word: z.string().trim().min(1).max(80),
  })
  .strict();

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
                  properties: { en: { type: 'string' }, zh: { type: 'string' } },
                  required: ['en'],
                },
                synonyms: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: { en: { type: 'string' }, zh: { type: 'string' } },
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
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleLLMRequest({
    req,
    res,
    label: 'Lookup API',
    querySchema: QuerySchema,
    resultSchema: SynonymResponseSchema,
    cacheControl: 'public, s-maxage=86400, stale-while-revalidate=604800',
    buildParams: ({ word }, model): OpenRouterCreateParams => ({
      model,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'lookup', strict: true, schema: lookupSchema },
      },
      reasoning: { effort: 'low', exclude: true },
      messages: [
        {
          role: 'system',
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
10. If a Chinese translation cannot be determined, omit the "zh" field for that item.`,
        },
        {
          role: 'user',
          content: `Define the word: "${word}"`,
        },
      ],
      temperature: 0,
    }),
  });
}
