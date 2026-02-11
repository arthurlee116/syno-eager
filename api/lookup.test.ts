// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from './lookup';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const { mockCreate } = vi.hoisted(() => {
  return { mockCreate: vi.fn() };
});

vi.mock('./_openai.js', () => {
  let currentStore: { capturedUpstreamErrorBody: string } | undefined;
  return {
    getOpenAIClient: vi.fn(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    storage: {
      run: vi.fn((store, callback) => {
        currentStore = store;
        return callback();
      }),
      getStore: vi.fn(() => currentStore),
    },
  };
});

describe('api/lookup', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-key' };

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    setHeaderMock = vi.fn();

    req = {
      method: 'GET',
      query: { word: 'test' },
    };
    res = {
      status: statusMock as unknown as (statusCode: number) => VercelResponse,
      setHeader: setHeaderMock as unknown as (name: string, value: string) => VercelResponse,
      json: jsonMock,
    } as unknown as VercelResponse;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 405 if method is not GET', async () => {
    req.method = 'POST';
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(405);
  });

  it('returns 400 if word is missing', async () => {
    req.query = {};
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('returns 500 if API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await handler(req as VercelRequest, res as VercelResponse);
    expect(statusMock).toHaveBeenCalledWith(500);
  });

  it('calls OpenAI and returns parsed data', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              word: 'test',
              phonetics: [],
              items: [],
            }),
          },
        },
      ],
    };
    mockCreate.mockResolvedValue(mockResponse);

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);

    const validData = {
        word: 'test',
        phonetics: [],
        items: [
            {
                partOfSpeech: 'noun',
                meanings: [
                    {
                        definition: 'a test',
                        example: { en: 'test example' },
                        synonyms: []
                    }
                ]
            }
        ]
    };

    mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validData) } }]
    });

    await handler(req as VercelRequest, res as VercelResponse);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      word: 'test',
    }));
  });
});
