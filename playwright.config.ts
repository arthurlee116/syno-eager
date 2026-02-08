import { defineConfig, devices } from '@playwright/test';

// Some environments set HTTP(S)_PROXY which can cause Playwright's webServer
// availability probe to hit the proxy instead of localhost. Ensure localhost
// bypasses proxies so the server is actually started when needed.
const ensureNoProxy = (hosts: string) => {
  const cur = process.env.NO_PROXY ?? process.env.no_proxy ?? '';
  const want = hosts.split(',').map((h) => h.trim()).filter(Boolean);
  const parts = cur.split(',').map((h) => h.trim()).filter(Boolean);
  for (const h of want) if (!parts.includes(h)) parts.push(h);
  const merged = parts.join(',');
  process.env.NO_PROXY = merged;
  process.env.no_proxy = merged;
};

ensureNoProxy('127.0.0.1,localhost');

const HOST = '127.0.0.1';
const PORT = 5173;
const baseURL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: baseURL,
    // Always start the dev server for e2e tests to avoid false positives from proxy probes.
    reuseExistingServer: false,
  },
});
