import { describe, it, expect, vi } from 'vitest';
import handler from './lookup';
import type { VercelRequest, VercelResponse } from '@vercel/node';

describe('api/lookup handler validation', () => {
  const mockResponse = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as VercelResponse;
    (res.status as any).mockReturnValue(res);
    (res.json as any).mockReturnValue(res);
    return res;
  };

  it('should return 400 if word is missing', async () => {
    const req = { method: 'GET', query: {} } as unknown as VercelRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('required')
    }));
  });

  it('should return 400 if word is not a string', async () => {
    const req = { method: 'GET', query: { word: ['word1', 'word2'] } } as unknown as VercelRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 if word is too long', async () => {
    const longWord = 'a'.repeat(101);
    const req = { method: 'GET', query: { word: longWord } } as unknown as VercelRequest;
    const res = mockResponse();

    await handler(req, res);

    // This is expected to FAIL before the fix, and PASS after the fix
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('100 characters')
    }));
  });

  it('should return 400 if word is empty', async () => {
    const req = { method: 'GET', query: { word: '' } } as unknown as VercelRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
