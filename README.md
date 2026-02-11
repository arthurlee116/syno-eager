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

## WebMCP (In-Browser Tools)

This app registers two WebMCP tools (via `navigator.modelContext`) when the MCP-B polyfill is available:

- `lookup_synonyms`
- `lookup_connotation`

### Try It Locally

1. Install the MCP-B Extension in Chrome: [MCP-B extension](https://chromewebstore.google.com/detail/mcp-b-extension/daohopfhkdelnpemnhlekblhnikhdhfa)
2. Run the app with APIs enabled:
   ```bash
   vercel dev
   ```
3. Open the site in Chrome, click the extension icon, and check the **Tools** tab.

### Example Inputs

`lookup_synonyms`
```json
{ "word": "eager" }
```

`lookup_connotation`
```json
{
  "headword": "serendipity",
  "synonym": "chance",
  "partOfSpeech": "noun",
  "definition": "The occurrence of events by chance in a happy way."
}
```
