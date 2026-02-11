import { AsyncLocalStorage } from 'node:async_hooks';
import OpenAI from 'openai';
import { ProxyAgent } from 'undici';

export const storage = new AsyncLocalStorage<{ capturedUpstreamErrorBody: string }>();

let openai: OpenAI | null = null;

function getProxyURL(): string | null {
  return (
    process.env.OPENROUTER_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    null
  );
}

export function getOpenAIClient(): OpenAI {
  if (openai) return openai;

  const proxyURL = getProxyURL();
  const dispatcher = proxyURL ? new ProxyAgent(proxyURL) : undefined;
  const referer = process.env.OPENROUTER_SITE_URL || process.env.VERCEL_URL || 'http://localhost';
  const title = process.env.OPENROUTER_APP_NAME || 'Syno-Eager';

  openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    fetchOptions: dispatcher ? ({ dispatcher } as Record<string, unknown>) : undefined,
    defaultHeaders: {
      'HTTP-Referer': referer,
      'X-Title': title,
    },
    fetch: async (...args: Parameters<typeof fetch>) => {
      const res = await fetch(...args);
      if (!res.ok) {
        const store = storage.getStore();
        if (store) {
          try {
            const text = await res.clone().text();
            store.capturedUpstreamErrorBody = text.slice(0, 8_192);
          } catch {
            store.capturedUpstreamErrorBody = '';
          }
        }
      }
      return res;
    },
  });

  return openai;
}
