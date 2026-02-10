# Syno-Eager

A high-performance synonym finder using the "Eager Fetching" pattern.

## Setup

1.  Copy `.env.example` to `.env` and add your OpenRouter API Key.
    ```bash
    cp .env.example .env
    ```

    If your network requires an outbound proxy, also set:
    - `OPENROUTER_PROXY_URL` (example: `http://127.0.0.1:10808`)

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Run locally:
    You need the Vercel CLI to run the serverless functions locally.
    ```bash
    npm i -g vercel
    vercel dev
    ```
    
    Or just the frontend (API will fail without proxy):
    ```bash
    pnpm dev
    ```

## Deploy

```bash
vercel deploy
```
