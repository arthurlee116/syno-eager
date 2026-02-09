
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { performance } from 'node:perf_hooks';
import OpenAI from 'openai';
import { ProxyAgent } from 'undici';

// Mock env vars for benchmark
process.env.OPENROUTER_API_KEY = 'sk-benchmark-key';
process.env.OPENROUTER_SITE_URL = 'http://benchmark.local';
process.env.OPENROUTER_APP_NAME = 'BenchmarkApp';

// Mock fetch to avoid network calls
const mockFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  return new Response(JSON.stringify({
    id: 'bench-123',
    object: 'chat.completion',
    created: 1677652288,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: JSON.stringify({ word: "test", items: [] }) },
      finish_reason: 'stop'
    }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  }), { status: 200 });
};

// --- BASELINE: Instantiation per request ---
async function runBaseline(iterations: number) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const referer = process.env.OPENROUTER_SITE_URL || 'http://localhost';
    const title = process.env.OPENROUTER_APP_NAME || 'Syno-Eager';

    // Simulate checking proxy
    const proxyURL = process.env.OPENROUTER_PROXY_URL;
    const dispatcher = proxyURL ? new ProxyAgent(proxyURL) : undefined;

    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      fetchOptions: dispatcher ? ({ dispatcher } as Record<string, unknown>) : undefined,
      defaultHeaders: {
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      // @ts-ignore
      fetch: mockFetch,
    });

    await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
    });
  }

  const end = performance.now();
  return end - start;
}


// --- OPTIMIZED: Global client ---
// Setup global client once
const refererGlobal = process.env.OPENROUTER_SITE_URL || 'http://localhost';
const titleGlobal = process.env.OPENROUTER_APP_NAME || 'Syno-Eager';
const proxyURLGlobal = process.env.OPENROUTER_PROXY_URL;
const dispatcherGlobal = proxyURLGlobal ? new ProxyAgent(proxyURLGlobal) : undefined;

const openaiGlobal = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  fetchOptions: dispatcherGlobal ? ({ dispatcher: dispatcherGlobal } as Record<string, unknown>) : undefined,
  defaultHeaders: {
    'HTTP-Referer': refererGlobal,
    'X-Title': titleGlobal,
  },
  // @ts-ignore
  fetch: mockFetch,
});

async function runOptimized(iterations: number) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await openaiGlobal.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
    });
  }

  const end = performance.now();
  return end - start;
}

async function main() {
  const iterations = 5000;
  console.log(`Running benchmark with ${iterations} iterations...`);

  // Warmup
  await runBaseline(10);
  await runOptimized(10);

  // Measure Baseline
  console.log('Running Baseline...');
  const baselineTime = await runBaseline(iterations);
  const baselineOps = iterations / (baselineTime / 1000);
  console.log(`Baseline: ${baselineTime.toFixed(2)}ms (${baselineOps.toFixed(2)} ops/sec)`);

  // Measure Optimized
  console.log('Running Optimized...');
  const optimizedTime = await runOptimized(iterations);
  const optimizedOps = iterations / (optimizedTime / 1000);
  console.log(`Optimized: ${optimizedTime.toFixed(2)}ms (${optimizedOps.toFixed(2)} ops/sec)`);

  const improvement = ((baselineTime - optimizedTime) / baselineTime) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}% faster`);
}

main().catch(console.error);
