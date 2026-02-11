import { useEffect } from 'react';
import { z } from 'zod';
import { lookupConnotation, lookupSynonyms } from '@/lib/lookupApi';

type ToolDescriptor = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  execute: (input: unknown) => Promise<ToolResult>;
};

type ModelContext = {
  registerTool: (tool: ToolDescriptor) => { unregister?: () => void };
};

type ToolResult = {
  content: Array<
    | { type: 'text'; text: string }
    // MCP-B supports reference content; we don't use it here but keep the union open.
    | { type: 'reference'; id: string; description?: string; requiresUserConsent?: boolean }
  >;
  isError?: boolean;
};

const LookupSynonymsInputSchema = z.object({
  word: z.string().trim().min(1).max(64),
});

const LookupConnotationInputSchema = z.object({
  headword: z.string().trim().min(1).max(64),
  synonym: z.string().trim().min(1).max(64),
  partOfSpeech: z.string().trim().min(1).max(24),
  definition: z.string().trim().min(1).max(400),
});

function formatZodError(prefix: string, err: z.ZodError): string {
  const details = err.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  return `${prefix}\n${details}`;
}

export function WebMCPTools() {
  useEffect(() => {
    const mc = (globalThis.navigator as unknown as { modelContext?: unknown } | undefined)
      ?.modelContext as ModelContext | undefined;

    if (!mc?.registerTool) return;

    const regs: Array<{ unregister?: () => void }> = [];

    regs.push(
      mc.registerTool({
        name: 'lookup_synonyms',
        description: 'Look up synonyms for an English word using Syno-Eager.',
        inputSchema: {
          type: 'object',
          properties: {
            word: { type: 'string', description: 'Word to look up', minLength: 1, maxLength: 64 },
          },
          required: ['word'],
        },
        async execute(rawInput: unknown): Promise<ToolResult> {
          const parsed = LookupSynonymsInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            return {
              content: [{ type: 'text', text: formatZodError('Invalid input for lookup_synonyms.', parsed.error) }],
              isError: true,
            };
          }

          try {
            const data = await lookupSynonyms(parsed.data.word);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            return { content: [{ type: 'text', text: msg }], isError: true };
          }
        },
      }),
    );

    regs.push(
      mc.registerTool({
        name: 'lookup_connotation',
        description:
          'Generate connotation guidance for a candidate synonym given a specific headword sense (human-in-the-loop).',
        inputSchema: {
          type: 'object',
          properties: {
            headword: { type: 'string', description: 'The headword', minLength: 1, maxLength: 64 },
            synonym: { type: 'string', description: 'The candidate synonym', minLength: 1, maxLength: 64 },
            partOfSpeech: { type: 'string', description: 'Part of speech for the sense', minLength: 1, maxLength: 24 },
            definition: { type: 'string', description: 'Definition of the headword sense', minLength: 1, maxLength: 400 },
          },
          required: ['headword', 'synonym', 'partOfSpeech', 'definition'],
        },
        async execute(rawInput: unknown): Promise<ToolResult> {
          const parsed = LookupConnotationInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            return {
              content: [{ type: 'text', text: formatZodError('Invalid input for lookup_connotation.', parsed.error) }],
              isError: true,
            };
          }

          try {
            const data = await lookupConnotation(parsed.data);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            return { content: [{ type: 'text', text: msg }], isError: true };
          }
        },
      }),
    );

    return () => {
      for (const r of regs) r.unregister?.();
    };
  }, []);

  return null;
}
