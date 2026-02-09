import { describe, it, expect } from 'vitest';
import { redactSensitiveInfo } from './redact';

describe('redactSensitiveInfo', () => {
  it('should redact sensitive keys in objects (case-insensitive)', () => {
    const data = {
      apiKey: 'sk-1234567890abcdef',
      API_KEY: 'sk-1234567890abcdef',
      authorization: 'Bearer sk-1234567890abcdef',
      cookie: 'session=secret',
      password: 'mypassword',
      secret: 'mysecret',
      token: 'mytoken',
      other: 'public'
    };
    const redacted = redactSensitiveInfo(data);
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect(redacted.API_KEY).toBe('[REDACTED]');
    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.cookie).toBe('[REDACTED]');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.secret).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.other).toBe('public');
  });

  it('should redact API key patterns in strings', () => {
    const str = 'My key is sk-1234567890abcdef1234567890';
    expect(redactSensitiveInfo(str)).toBe('My key is [REDACTED]');
  });

  it('should handle nested objects and arrays', () => {
    const data = {
      user: {
        name: 'John',
        token: 'secret-token'
      },
      items: [
        { id: 1, secret: 'shh' },
        'Just a string with sk-1234567890'
      ]
    };
    const redacted = redactSensitiveInfo(data);
    expect(redacted.user.token).toBe('[REDACTED]');
    expect(redacted.items[0].secret).toBe('[REDACTED]');
    expect(redacted.items[1]).toBe('Just a string with [REDACTED]');
  });

  it('should handle Error objects', () => {
    const error = new Error('Failed with key sk-1234567890');
    (error as any).apiKey = 'sk-1111111111';
    const redacted = redactSensitiveInfo(error);
    expect(redacted.message).toBe('Failed with [REDACTED]');
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect(redacted.stack).toContain('[REDACTED]');
  });

  it('should handle circular references', () => {
    const data: any = { a: 1 };
    data.self = data;
    const redacted = redactSensitiveInfo(data);
    expect(redacted.a).toBe(1);
    expect(redacted.self).toBe('[Circular]');
  });
});
