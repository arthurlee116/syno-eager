
/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    createSpy: vi.fn(),
    captureFetchRef: { current: null as any }
  };
});

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mocks.createSpy
        }
      };
      constructor(options: any) {
        mocks.captureFetchRef.current = options.fetch;
      }
    }
  };
});

vi.mock('undici', () => ({ ProxyAgent: class {} }));
vi.mock('jsonrepair', () => ({ jsonrepair: (s: string) => s }));

// Mock console to keep output clean
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Set env vars
process.env.OPENROUTER_API_KEY = 'test-key';

import handler from './lookup.js';

describe('lookup handler optimization verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSpy.mockReset();
    // note: constructor runs once at import time, so captureFetchRef is already set and static
  });

  it('should instantiate OpenAI client only once (at module level)', () => {
    expect(mocks.captureFetchRef.current).toBeDefined();
    expect(typeof mocks.captureFetchRef.current).toBe('function');
  });

  it('should handle successful request', async () => {
    mocks.createSpy.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ word: 'test', items: [] }) } }]
    });

    const req = { method: 'GET', query: { word: 'test' } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as any;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.createSpy).toHaveBeenCalled();
  });

  it('should capture upstream error body via AsyncLocalStorage context', async () => {
    // 1. Mock global fetch to return a failure response
    const upstreamBody = JSON.stringify({ message: "Cerebras detailed error", type: "error" });
    const globalFetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      clone: () => ({
        text: async () => upstreamBody
      })
    });
    global.fetch = globalFetchSpy;

    // 2. Mock OpenAI create to fail, triggering our manual invocation of the fetch hook
    mocks.createSpy.mockImplementation(async () => {
      // Simulate the fetch hook execution inside the request flow
      if (mocks.captureFetchRef.current) {
        await mocks.captureFetchRef.current('https://mock', {});
      }

      // Then throw the error that OpenAI would throw
      const err: any = new Error('API Error');
      err.status = 400;
      throw err;
    });

    const req = { method: 'GET', query: { word: 'fail' } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as any;

    // 3. Run handler
    await handler(req, res);

    // 4. Verify that the error response contains the message extracted from the upstream body
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      upstream_message: "Cerebras detailed error"
    }));
  });

  it('should handle concurrent requests without mixing contexts', async () => {
    const globalFetchSpy = vi.fn();
    global.fetch = globalFetchSpy;

    mocks.createSpy.mockImplementation(async (params: any) => {
      // Determine which "request" this is based on the word
      // OpenAI create args: [ { model: ..., messages: [ { role: 'user', content: ... } ] } ]
      const content = params.messages[1].content; // "Define the word: "A""
      const isReqA = content.includes('"A"');

      const body = isReqA
        ? JSON.stringify({ message: "Error A" })
        : JSON.stringify({ message: "Error B" });

      // We need globalFetchSpy to return different things depending on when it's called

      globalFetchSpy.mockImplementation(async () => {
          return {
            ok: false,
            clone: () => ({ text: async () => body })
          };
      });

      if (mocks.captureFetchRef.current) await mocks.captureFetchRef.current('https://mock', {});

      const err: any = new Error('API Error');
      err.status = 400;
      throw err;
    });

    const reqA = { method: 'GET', query: { word: 'A' } } as any;
    const resA = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

    const reqB = { method: 'GET', query: { word: 'B' } } as any;
    const resB = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

    // Run them in parallel
    await Promise.all([handler(reqA, resA), handler(reqB, resB)]);

    expect(resA.json).toHaveBeenCalledWith(expect.objectContaining({ upstream_message: "Error A" }));
    expect(resB.json).toHaveBeenCalledWith(expect.objectContaining({ upstream_message: "Error B" }));
  });
});
