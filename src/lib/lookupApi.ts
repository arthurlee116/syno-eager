import { type SynonymResponse, type ConnotationResponse } from '@/lib/types';
import { readErrorMessage, toSearchParams } from '@/lib/http';

export async function lookupSynonyms(word: string): Promise<SynonymResponse> {
  const url = `/api/lookup?${toSearchParams({ word })}`;
  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
    if (res.status === 402) {
      const msg =
        (await readErrorMessage(res)) ||
        'Cerebras returned 402 (payment required). Please check billing/quota.';
      throw new Error(msg);
    }
    if (res.status === 500) {
      const msg = (await readErrorMessage(res)) || 'Failed to parse dictionary data. Please try again.';
      throw new Error(msg);
    }
    const msg = (await readErrorMessage(res)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Server validates and normalizes the response shape already; keep the client lightweight.
  return (await res.json()) as SynonymResponse;
}

export type ConnotationParams = {
  headword: string;
  synonym: string;
  partOfSpeech: string;
  definition: string;
};

export async function lookupConnotation(params: ConnotationParams): Promise<ConnotationResponse> {
  const url = `/api/connotation?${toSearchParams({
    headword: params.headword,
    synonym: params.synonym,
    partOfSpeech: params.partOfSpeech,
    definition: params.definition,
  })}`;

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
    if (res.status === 402) {
      const msg =
        (await readErrorMessage(res)) ||
        'Upstream returned 402 (payment required). Please check billing/quota.';
      throw new Error(msg);
    }
    if (res.status === 500) {
      const msg = (await readErrorMessage(res)) || 'Failed to fetch connotation. Please try again.';
      throw new Error(msg);
    }
    const msg = (await readErrorMessage(res)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (await res.json()) as ConnotationResponse;
}

