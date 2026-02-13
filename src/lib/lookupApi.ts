import { type SynonymResponse } from './synonymSchema';
import { type ConnotationResponse } from './connotationSchema';
import { readErrorMessage, toSearchParams } from '@/lib/http';

const STATUS_MESSAGES: Record<number, string> = {
  429: 'Rate limit exceeded. Please wait a moment.',
  402: 'Upstream returned 402 (payment required). Please check billing/quota.',
};

async function fetchApi<T>(url: string, fallbackMessage: string): Promise<T> {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const knownMsg = STATUS_MESSAGES[res.status];
    if (knownMsg && res.status === 429) throw new Error(knownMsg);
    const msg = (await readErrorMessage(res)) || knownMsg || fallbackMessage || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function lookupSynonyms(word: string): Promise<SynonymResponse> {
  return fetchApi<SynonymResponse>(
    `/api/lookup?${toSearchParams({ word })}`,
    'Failed to parse dictionary data. Please try again.',
  );
}

export type ConnotationParams = {
  headword: string;
  synonym: string;
  partOfSpeech: string;
  definition: string;
};

export async function lookupConnotation(params: ConnotationParams): Promise<ConnotationResponse> {
  return fetchApi<ConnotationResponse>(
    `/api/connotation?${toSearchParams({
      headword: params.headword,
      synonym: params.synonym,
      partOfSpeech: params.partOfSpeech,
      definition: params.definition,
    })}`,
    'Failed to fetch connotation. Please try again.',
  );
}

