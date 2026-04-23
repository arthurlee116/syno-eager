import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  extractFirstJsonObject,
  stripCodeFences,
  parseJsonFromLLM,
  getRetryAfterSecondsFrom429,
  getUpstreamStatus,
  getUpstreamMessage,
  handleLLMRequest,
} from './openrouter';

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('extractFirstJsonObject', () => {
  it('extracts a simple JSON object', () => {
    const input = '{"key": "value"}';
    expect(extractFirstJsonObject(input)).toBe('{"key": "value"}');
  });

  it('extracts JSON from surrounding text', () => {
    const input = 'Here is the result: {"word": "hello"} and some trailing text';
    expect(extractFirstJsonObject(input)).toBe('{"word": "hello"}');
  });

  it('handles nested objects', () => {
    const input = '{"outer": {"inner": 1}}';
    expect(extractFirstJsonObject(input)).toBe('{"outer": {"inner": 1}}');
  });

  it('handles strings containing braces', () => {
    const input = '{"text": "a { b } c"}';
    expect(extractFirstJsonObject(input)).toBe('{"text": "a { b } c"}');
  });

  it('handles escaped quotes in strings', () => {
    const input = '{"text": "say \\"hello\\""}';
    expect(extractFirstJsonObject(input)).toBe('{"text": "say \\"hello\\""}');
  });

  it('returns null for no JSON object', () => {
    expect(extractFirstJsonObject('no json here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractFirstJsonObject('')).toBeNull();
  });
});

describe('stripCodeFences', () => {
  it('strips ```json fences', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}\n');
  });

  it('strips plain ``` fences', () => {
    expect(stripCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}\n');
  });

  it('is case-insensitive', () => {
    expect(stripCodeFences('```JSON\n{"a":1}\n```')).toBe('{"a":1}\n');
  });

  it('leaves plain text untouched', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe('parseJsonFromLLM', () => {
  it('parses clean JSON directly', () => {
    expect(parseJsonFromLLM('{"word": "test"}', 'Test')).toEqual({ word: 'test' });
  });

  it('parses JSON wrapped in code fences', () => {
    const input = '```json\n{"word": "test"}\n```';
    expect(parseJsonFromLLM(input, 'Test')).toEqual({ word: 'test' });
  });

  it('repairs and parses slightly malformed JSON', () => {
    // Missing closing quote
    const input = '{"word": "test}';
    expect(() => parseJsonFromLLM(input, 'Test')).not.toThrow();
  });

  it('returns repaired result for text that jsonrepair can handle', () => {
    // jsonrepair is aggressive and can turn most text into valid JSON
    expect(() => parseJsonFromLLM('this is not json at all and has no braces', 'Test'))
      .not.toThrow();
  });
});

describe('getRetryAfterSecondsFrom429', () => {
  it('returns retry-after header value for 429 errors', () => {
    const error = { status: 429, headers: { 'retry-after': '30' } };
    expect(getRetryAfterSecondsFrom429(error)).toBe('30');
  });

  it('returns "60" as default for 429 without header', () => {
    const error = { status: 429 };
    expect(getRetryAfterSecondsFrom429(error)).toBe('60');
  });

  it('returns undefined for non-429 errors', () => {
    const error = { status: 500 };
    expect(getRetryAfterSecondsFrom429(error)).toBeUndefined();
  });

  it('returns undefined for non-object errors', () => {
    expect(getRetryAfterSecondsFrom429('string error')).toBeUndefined();
  });
});

describe('getUpstreamStatus', () => {
  it('extracts numeric status', () => {
    expect(getUpstreamStatus({ status: 402 })).toBe(402);
  });

  it('defaults to 500 for missing status', () => {
    expect(getUpstreamStatus({})).toBe(500);
  });

  it('defaults to 500 for non-object errors', () => {
    expect(getUpstreamStatus(null)).toBe(500);
    expect(getUpstreamStatus('string')).toBe(500);
  });
});

describe('getUpstreamMessage', () => {
  it('extracts message from error.error.message', () => {
    const error = { error: { message: 'quota exceeded' } };
    expect(getUpstreamMessage(error, '')).toBe('quota exceeded');
  });

  it('extracts message from captured body', () => {
    const error = {};
    const body = JSON.stringify({ message: 'rate limited' });
    expect(getUpstreamMessage(error, body)).toBe('rate limited');
  });

  it('returns undefined when no message found', () => {
    expect(getUpstreamMessage({}, '')).toBeUndefined();
  });

  it('returns undefined for non-object error', () => {
    expect(getUpstreamMessage(null, '')).toBeUndefined();
  });
});

describe('handleLLMRequest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-key' };
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockReq = (query: Record<string, string> = {}) => ({
    method: 'GET',
    query,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const mockRes = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    return res;
  };

  const querySchema = z.object({ word: z.string() });
  const resultSchema = z.object({ result: z.string() });

  it('sets Cache-Control header when configured', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"result": "success"}' } }],
    });

    const req = mockReq({ word: 'test' });
    const res = mockRes();

    await handleLLMRequest({
      req,
      res,
      label: 'Test',
      querySchema,
      resultSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildParams: () => ({ messages: [] } as any),
      cacheControl: 'public, max-age=3600',
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: 'success' });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
  });

  it('does NOT set Cache-Control header when not configured', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"result": "success"}' } }],
    });

    const req = mockReq({ word: 'test' });
    const res = mockRes();

    await handleLLMRequest({
      req,
      res,
      label: 'Test',
      querySchema,
      resultSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildParams: () => ({ messages: [] } as any),
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.any(String));
  });

  it('does NOT set Cache-Control header on error', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));

    const req = mockReq({ word: 'test' });
    const res = mockRes();

    await handleLLMRequest({
      req,
      res,
      label: 'Test',
      querySchema,
      resultSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildParams: () => ({ messages: [] } as any),
    });

    expect(res.status).toHaveBeenCalledWith(500); // Default error status
    expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.any(String));
  });
});
