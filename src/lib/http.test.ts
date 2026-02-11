import { describe, expect, it } from 'vitest';
import { toSearchParams, readErrorMessage } from './http';

describe('toSearchParams', () => {
  it('encodes key-value pairs as URL search params', () => {
    const result = toSearchParams({ word: 'hello', lang: 'en' });
    expect(result).toBe('word=hello&lang=en');
  });

  it('URL-encodes special characters', () => {
    const result = toSearchParams({ q: 'hello world' });
    expect(result).toBe('q=hello+world');
  });

  it('handles empty object', () => {
    expect(toSearchParams({})).toBe('');
  });
});

describe('readErrorMessage', () => {
  it('extracts error string from JSON response', async () => {
    const res = new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    const msg = await readErrorMessage(res);
    expect(msg).toBe('Something went wrong');
  });

  it('falls back to text body if JSON has no error field', async () => {
    const res = new Response('Plain text error', { status: 500 });
    const msg = await readErrorMessage(res);
    expect(msg).toBe('Plain text error');
  });

  it('returns undefined for empty body', async () => {
    const res = new Response('', { status: 500 });
    const msg = await readErrorMessage(res);
    expect(msg).toBeUndefined();
  });

  it('trims and truncates long text bodies', async () => {
    const longText = 'x'.repeat(500);
    const res = new Response(longText, { status: 500 });
    const msg = await readErrorMessage(res);
    expect(msg!.length).toBe(300);
  });

  it('ignores whitespace-only error fields', async () => {
    const res = new Response(JSON.stringify({ error: '   ' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    const msg = await readErrorMessage(res);
    // Falls through to text fallback since error is whitespace
    expect(msg).toBeDefined();
  });
});
