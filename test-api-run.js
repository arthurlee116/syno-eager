// Minimal Node script to test the Vercel function
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function test() {
  try {
    // Load the function code
    const code = await readFile(join(__dirname, 'api/lookup.ts'), 'utf-8');
    // Transpile with TypeScript? This is complex without ts-node.
    // We'll just try to require it if compiled JS exists.
    // Let's check if there's a compiled version in dist
    const compiledPath = join(__dirname, '.vercel/output/functions/api/lookup.func/index.mjs');
    const module = await import(compiledPath);
    console.log('Function module loaded');
    
    // Mock Vercel request/response
    const req = { method: 'GET', query: { word: 'test' }, headers: {} };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(s) { this.statusCode = s; return this; },
      json(data) { this.body = data; },
      end() {},
    };
    
    await module.default(req, res);
    console.log('Response status:', res.statusCode);
    console.log('Response body:', res.body);
  } catch (err) {
    console.error('Test error:', err);
  }
}
test();
