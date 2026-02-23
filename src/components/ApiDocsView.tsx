import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

const API_DOCS_MARKDOWN = `# Syno-Eager API

Syno-Eager exposes simple read-only HTTP endpoints for AI tools, scripts, and integrations.

- Base URL: \`https://your-domain.com\`
- Auth: none (no client API key required)
- Method: \`GET\`
- Rate limit: **20 requests per hour per IP**

## 1) Lookup Synonyms

\`GET /api/lookup?word={word}\`

### Query Parameters
- \`word\` (string, required, 1-80 chars): target word to look up

### cURL Example
\`\`\`bash
curl "https://your-domain.com/api/lookup?word=bright"
\`\`\`

### JavaScript Example
\`\`\`js
const res = await fetch("https://your-domain.com/api/lookup?word=bright");
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
console.log(data.word, data.items?.length);
\`\`\`

### Response Example (shortened)
\`\`\`json
{
  "word": "bright",
  "phonetics": ["brait"],
  "items": [
    {
      "partOfSpeech": "adjective",
      "meanings": [
        {
          "definition": "giving out or reflecting much light",
          "example": { "en": "The room was bright at noon.", "zh": "中午时房间很明亮。" },
          "synonyms": [{ "en": "luminous", "zh": "发光的" }]
        }
      ]
    }
  ]
}
\`\`\`

## 2) Connotation Analysis

\`GET /api/connotation?headword={headword}&synonym={synonym}&partOfSpeech={pos}&definition={definition}\`

### Query Parameters
- \`headword\` (string, required, 1-80 chars)
- \`synonym\` (string, required, 1-80 chars)
- \`partOfSpeech\` (string, required, 1-40 chars)
- \`definition\` (string, required, 1-400 chars)

### cURL Example
\`\`\`bash
curl --get "https://your-domain.com/api/connotation" \\
  --data-urlencode "headword=cheap" \\
  --data-urlencode "synonym=inexpensive" \\
  --data-urlencode "partOfSpeech=adjective" \\
  --data-urlencode "definition=costing little money"
\`\`\`

### JavaScript Example
\`\`\`js
const params = new URLSearchParams({
  headword: "cheap",
  synonym: "inexpensive",
  partOfSpeech: "adjective",
  definition: "costing little money"
});
const res = await fetch("https://your-domain.com/api/connotation?" + params.toString());
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
console.log(data.polarity, data.register, data.toneTags);
\`\`\`

### Response Example (shortened)
\`\`\`json
{
  "headword": "cheap",
  "synonym": "inexpensive",
  "partOfSpeech": "adjective",
  "definition": "costing little money",
  "polarity": "neutral",
  "register": "neutral",
  "toneTags": [
    { "en": "practical", "zh": "务实" }
  ],
  "usageNote": {
    "en": "Inexpensive sounds neutral and product-focused.",
    "zh": "inexpensive 语气中性，更强调商品属性。"
  }
}
\`\`\`

## Errors

- \`400\`: invalid query parameters
- \`405\`: method not allowed
- \`429\`: rate limit exceeded (check \`Retry-After\`)
- \`500+\`: upstream or server error

## Rate-Limit Headers

- \`X-RateLimit-Limit\`: max requests in current window
- \`X-RateLimit-Remaining\`: remaining requests
- \`X-RateLimit-Reset\`: unix timestamp (seconds) when window resets
- \`Retry-After\`: seconds to wait when blocked
`;

async function copyApiDocsMarkdown(markdown: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(markdown);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = markdown;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error('Copy failed');
  }
}

export function ApiDocsView() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await copyApiDocsMarkdown(API_DOCS_MARKDOWN);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopyError((error as Error).message || 'Copy failed');
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto pt-24 pb-10 relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 15%, hsl(var(--primary) / 0.15) 0px, transparent 24%), radial-gradient(circle at 80% 0%, hsl(var(--foreground) / 0.04) 0px, transparent 30%)',
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
        <aside className="lg:sticky lg:top-28 h-fit border border-border bg-card/70 backdrop-blur-sm p-5 space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Access</p>
            <h1 className="text-3xl font-display font-semibold leading-tight">API Manual</h1>
            <p className="text-sm text-muted-foreground">
              Single-file Markdown docs. Built for copy/paste into AI tools.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="border-l-2 border-primary pl-3">
              <p className="text-muted-foreground">Auth</p>
              <p className="font-medium">No API key</p>
            </div>
            <div className="border-l-2 border-primary pl-3">
              <p className="text-muted-foreground">Rate limit</p>
              <p className="font-medium">20 req / hour / IP</p>
            </div>
            <div className="border-l-2 border-primary pl-3">
              <p className="text-muted-foreground">Endpoints</p>
              <p className="font-medium">/api/lookup, /api/connotation</p>
            </div>
          </div>

          <Button
            onClick={handleCopy}
            className="w-full rounded-none"
            aria-label="Copy as Markdown"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy as Markdown'}
          </Button>

          {copyError && (
            <p className="text-sm text-destructive">{copyError}</p>
          )}
        </aside>

        <div className="border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">api-docs.md</p>
          </div>

          <pre className="whitespace-pre-wrap break-words p-6 md:p-8 text-[13px] md:text-sm leading-7 overflow-x-auto">
            {API_DOCS_MARKDOWN}
          </pre>
        </div>
      </div>
    </section>
  );
}
