/**
 * Redacts sensitive information from strings and objects.
 * Useful for sanitizing logs and API responses.
 */
export function redactSensitiveInfo(data: unknown, seen = new WeakMap()): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact potential API keys (e.g., sk-...)
    return data.replace(/sk-[a-zA-Z0-9]{10,}/g, '[REDACTED]');
  }

  if (typeof data === 'object') {
    // Handle circular references
    if (seen.has(data as object)) {
      return '[Circular]';
    }
    seen.set(data as object, true);

    if (Array.isArray(data)) {
      return data.map(item => redactSensitiveInfo(item, seen));
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: redactSensitiveInfo(data.message, seen),
        stack: redactSensitiveInfo(data.stack, seen),
        ...redactSensitiveInfo({ ...data }, seen),
      };
    }

    const redactedObj: Record<string, any> = {};
    const sensitiveKeys = ['apikey', 'api_key', 'authorization', 'cookie', 'password', 'secret', 'token'];

    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        redactedObj[key] = '[REDACTED]';
      } else {
        redactedObj[key] = redactSensitiveInfo(value, seen);
      }
    }
    return redactedObj;
  }

  return data;
}
