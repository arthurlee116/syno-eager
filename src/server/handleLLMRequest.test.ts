import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleLLMRequest } from './openrouter';
import { z } from 'zod';

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('handleLLMRequest', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let req: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');

    req = {
      method: 'GET',
      query: { word: 'test' },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ result: 'success' }) } }],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets Cache-Control header on success', async () => {
    await handleLLMRequest({
      req,
      res,
      label: 'test',
      querySchema: z.object({ word: z.string() }),
      resultSchema: z.object({ result: z.string() }),
      buildParams: () => ({ model: 'test-model', messages: [] }),
    });

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=3600'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: 'success' });
  });
});
