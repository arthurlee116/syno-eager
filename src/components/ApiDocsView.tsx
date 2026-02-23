import { isValidElement, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/primitives/Button';

const PUBLIC_BASE_URL = 'https://synoyes.vercel.app';

const API_DOCS_MARKDOWN = `# Syno-Eager API

AI-first reference designed for LLM agents and scripts.

## Quick Contract

- Base URL: \`${PUBLIC_BASE_URL}\`
- Auth: none (no client API key required)
- Method: \`GET\`
- Response format: JSON object
- Rate limit: **20 requests per hour per IP**
- Rate-limit headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`, \`Retry-After\`

## Canonical Error Shape

\`\`\`json
{
  "error": "string",
  "issues": [
    { "path": "query.field", "message": "validation message" }
  ],
  "upstream_status": 500,
  "upstream_message": "optional upstream detail"
}
\`\`\`

## OpenAPI 3.1 (Minimal, AI-Friendly)

\`\`\`yaml
openapi: 3.1.0
info:
  title: Syno-Eager API
  version: 1.0.0
servers:
  - url: ${PUBLIC_BASE_URL}
paths:
  /api/lookup:
    get:
      summary: Lookup synonyms and definitions
      parameters:
        - in: query
          name: word
          required: true
          schema:
            type: string
            minLength: 1
            maxLength: 80
      responses:
        "200":
          description: OK
        "400":
          description: Invalid query parameters
        "429":
          description: Rate limit exceeded
  /api/connotation:
    get:
      summary: Analyze synonym connotation in one specific sense
      parameters:
        - in: query
          name: headword
          required: true
          schema: { type: string, minLength: 1, maxLength: 80 }
        - in: query
          name: synonym
          required: true
          schema: { type: string, minLength: 1, maxLength: 80 }
        - in: query
          name: partOfSpeech
          required: true
          schema: { type: string, minLength: 1, maxLength: 40 }
        - in: query
          name: definition
          required: true
          schema: { type: string, minLength: 1, maxLength: 400 }
      responses:
        "200":
          description: OK
        "400":
          description: Invalid query parameters
        "429":
          description: Rate limit exceeded
\`\`\`

## Endpoint: \`GET /api/lookup\`

Required query:
- \`word\` (string, 1-80)

Example:
\`\`\`bash
curl "${PUBLIC_BASE_URL}/api/lookup?word=bright"
\`\`\`

Success sample:
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

## Endpoint: \`GET /api/connotation\`

Required query:
- \`headword\` (string, 1-80)
- \`synonym\` (string, 1-80)
- \`partOfSpeech\` (string, 1-40)
- \`definition\` (string, 1-400)

Example:
\`\`\`bash
curl --get "${PUBLIC_BASE_URL}/api/connotation" \\
  --data-urlencode "headword=cheap" \\
  --data-urlencode "synonym=inexpensive" \\
  --data-urlencode "partOfSpeech=adjective" \\
  --data-urlencode "definition=costing little money"
\`\`\`

Success sample:
\`\`\`json
{
  "headword": "cheap",
  "synonym": "inexpensive",
  "partOfSpeech": "adjective",
  "definition": "costing little money",
  "polarity": "neutral",
  "register": "neutral",
  "toneTags": [{ "en": "practical", "zh": "务实" }],
  "usageNote": {
    "en": "Inexpensive sounds neutral and product-focused.",
    "zh": "inexpensive 语气中性，更强调商品属性。"
  }
}
\`\`\`
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

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  children?: ReactNode;
};

function extractLanguage(className?: string): string {
  const match = className?.match(/language-([a-z0-9]+)/i);
  return match?.[1]?.toUpperCase() || 'TEXT';
}

function getCodeText(children: ReactNode): string {
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === 'string' ? child : '')).join('');
  }
  if (typeof children === 'string') return children;
  return '';
}

function renderCodeBlock(children: ReactNode): ReactNode {
  if (!isValidElement(children)) {
    return <pre className="overflow-x-auto">{children}</pre>;
  }

  const codeElement = children as ReactElement<MarkdownCodeProps>;
  const codeText = getCodeText(codeElement.props.children).replace(/\n$/, '');
  const lang = extractLanguage(codeElement.props.className);

  return (
    <div className="my-5 border border-border bg-foreground/[0.02] overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-foreground/[0.035]">
        <span className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] md:text-sm leading-6 font-mono text-foreground">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight mt-2 mb-5" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-xl md:text-2xl font-display font-semibold tracking-tight mt-10 mb-4" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-lg font-semibold mt-7 mb-3" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => <p className="leading-7 mb-4 text-foreground/95" {...props} />,
  ul: (props: ComponentPropsWithoutRef<'ul'>) => <ul className="mb-5 space-y-2 list-disc pl-6" {...props} />,
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="leading-7" {...props} />,
  code: ({ inline, children, ...props }: MarkdownCodeProps) => {
    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-none bg-foreground/[0.06] text-[0.95em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return <code {...props}>{children}</code>;
  },
  pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => renderCodeBlock(children),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => <strong className="font-semibold text-foreground" {...props} />,
};

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
              <p className="text-muted-foreground">Base URL</p>
              <p className="font-medium break-all">{PUBLIC_BASE_URL}</p>
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

        <article className="border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">api-docs.md</p>
          </div>

          <div className="p-6 md:p-8 text-[13px] md:text-sm leading-7">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {API_DOCS_MARKDOWN}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </section>
  );
}
