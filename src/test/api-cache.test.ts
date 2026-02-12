// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import lookupHandler from '../../api/lookup';
import connotationHandler from '../../api/connotation';
import { createOpenRouterClient } from '../server/openrouter';

// Mock the OpenRouter client creation
vi.mock('../server/openrouter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createOpenRouterClient: vi.fn(),
  };
});

describe('API Cache Headers', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    req = {
      method: 'GET',
      query: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as unknown as Partial<VercelResponse>;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    }
  });

  it('should reject unknown query parameters on lookup', async () => {
    req.query = { word: 'fast', x: '1' };
    await lookupHandler(req as VercelRequest, res as VercelResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should set Cache-Control headers on lookup success', async () => {
    req.query = { word: 'fast' };
    const mockResponse = {
      word: 'fast',
      phonetics: [],
      items: [
        {
          partOfSpeech: 'adjective',
          meanings: [
            {
              definition: 'Moving or capable of moving at high speed.',
              synonyms: [{ en: 'quick' }],
            },
          ],
        },
      ],
    };

    (createOpenRouterClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
        },
      },
    });

    await lookupHandler(req as VercelRequest, res as VercelResponse);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should reject unknown query parameters on connotation', async () => {
    req.query = {
      headword: 'happy',
      synonym: 'joyful',
      partOfSpeech: 'adjective',
      definition: 'feeling or showing pleasure or contentment.',
      x: '1',
    };
    await connotationHandler(req as VercelRequest, res as VercelResponse);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should set Cache-Control headers on connotation success', async () => {
    req.query = {
      headword: 'happy',
      synonym: 'joyful',
      partOfSpeech: 'adjective',
      definition: 'feeling or showing pleasure or contentment.',
    };

    const mockResponse = {
      headword: 'happy',
      synonym: 'joyful',
      partOfSpeech: 'adjective',
      definition: 'feeling or showing pleasure or contentment.',
      polarity: 'positive',
      register: 'neutral',
      toneTags: [{ en: 'formal' }],
      usageNote: { en: 'Note' },
      cautions: [],
      example: { en: 'Example' },
    };

    (createOpenRouterClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(mockResponse) } }],
          }),
        },
      },
    });

    await connotationHandler(req as VercelRequest, res as VercelResponse);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
