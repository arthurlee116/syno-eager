# Syno-Eager

Fast, AI-backed synonym explorer with bilingual (EN + zh-CN) definitions and per-synonym connotation notes.

- Exhaustive, structured lookup via strict JSON Schema output + Zod validation
- On-demand connotation hovercards (polarity, register, tone tags, usage notes)
- React Query caching tuned for "fetch once, reuse often"

## Tech Stack

- Frontend: React 19 + TypeScript (strict) + Vite + Tailwind CSS v4
- Data fetching: TanStack React Query v5
- UI: Radix Popover + shadcn-style primitives + Lucide + Framer Motion
- Backend: Vercel Serverless Functions (`api/*.ts`)
- LLM gateway: OpenAI Node SDK configured for OpenRouter (`src/server/openrouter.ts`)
- Validation: Zod schemas in `src/lib/*Schema.ts`
- Testing: Vitest (unit) + Playwright (E2E)
- Linting: ESLint v9 (flat config)

## Quick Start

### Prerequisites

- Node.js 20+ (tested locally with Node 24)
- pnpm

### 1) Configure Environment Variables

Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY`:

```bash
cp .env.example .env
```

If your network requires an outbound proxy (e.g. Clash), also set:

- `OPENROUTER_PROXY_URL` (example: `http://127.0.0.1:10808`)

### 2) Install Dependencies

```bash
pnpm install
```

### 3) Run Locally (Recommended: Full Stack)

This project uses Vercel Serverless Functions for `/api/*`. To run frontend + API together locally, use the Vercel CLI:

```bash
pnpm dlx vercel dev
```

Alternative (if you already use npm tooling):

```bash
npx vercel dev
```

### 4) Run Frontend Only (API Disabled)

You can run only the Vite dev server, but any calls to `/api/*` will fail:

```bash
pnpm dev
```

## Scripts

```bash
pnpm dev        # Start Vite dev server (frontend only)
pnpm build      # Typecheck + production build
pnpm preview    # Preview production build
pnpm lint       # ESLint
pnpm test       # Unit + E2E
pnpm test:unit  # Vitest
pnpm test:e2e   # Playwright
```

## Environment Variables

Required:

- `OPENROUTER_API_KEY`: OpenRouter API key (kept server-side in Vercel Functions)

Optional:

- `OPENROUTER_MODEL`: Model id on OpenRouter (default in code: `google/gemini-3-flash-preview`)
- `OPENROUTER_PROXY_URL`: Outbound proxy URL for local development
- `HTTPS_PROXY` / `HTTP_PROXY` / `https_proxy` / `http_proxy`: Standard proxy envs (also supported)
- `OPENROUTER_SITE_URL`: Sets OpenRouter `HTTP-Referer` header (defaults to `VERCEL_URL` or `http://localhost`)
- `OPENROUTER_APP_NAME`: Sets OpenRouter `X-Title` header (defaults to `Syno-Eager`)

## API

All API routes are implemented as Vercel Serverless Functions under `api/`.

### `GET /api/lookup?word=...`

- Query param: `word` (1-80 chars)
- Response shape: `src/lib/synonymSchema.ts` (`SynonymResponseSchema`)

### `GET /api/connotation?headword=...&synonym=...&partOfSpeech=...&definition=...`

- Used by the synonym hovercards to generate compact connotation guidance on demand
- Response shape: `src/lib/connotationSchema.ts` (`ConnotationResponseSchema`)

## Testing

- Unit tests run in `jsdom` and cover UI/helpers.
- E2E tests use Playwright and start a local Vite server automatically.
  - API requests are mocked in E2E specs, so you typically do not need `OPENROUTER_API_KEY` to run tests.

```bash
pnpm test:unit
pnpm test:e2e
```

## Deployment (Vercel)

Deploy with the Vercel CLI:

```bash
vercel deploy
```

Make sure the Vercel project has `OPENROUTER_API_KEY` set (Project Settings → Environment Variables).

## Project Conventions

- Do not edit `src/components/primitives/` (reserved for base UI building blocks).
- Prefer `@/*` path aliases for `src/*` imports.
- Treat Zod schemas as the contract:
  - Validate upstream LLM output before returning to the client
  - Keep API responses in sync with `src/lib/*Schema.ts`

## Troubleshooting

- `Server misconfiguration: Missing API Key`
  - Set `OPENROUTER_API_KEY` in `.env` (local) or in Vercel project env vars (production).
- HTTP `402` from upstream
  - Your provider/model requires billing/credits. Check your OpenRouter/provider dashboard.
- HTTP `429` rate limit
  - Wait and retry later. The API sets `Retry-After` when available.
- Proxy issues (local)
  - Set `OPENROUTER_PROXY_URL` (or `HTTPS_PROXY`/`HTTP_PROXY`).
  - If running E2E tests in a proxied environment, ensure `NO_PROXY` includes `127.0.0.1,localhost`.

## License

No license file is included in this repository yet.
