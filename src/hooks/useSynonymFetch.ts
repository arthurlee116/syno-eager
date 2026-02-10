import { useQuery } from '@tanstack/react-query';
import { type SynonymResponse } from '@/lib/types';

function toSearchParams(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  return sp.toString();
}

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.clone().json();
    if (data && typeof data === 'object') {
      const err = (data as Record<string, unknown>).error;
      if (typeof err === 'string' && err.trim()) return err.trim();
    }
  } catch {
    // ignore
  }
  try {
    const txt = await res.clone().text();
    if (txt && txt.trim()) return txt.trim().slice(0, 300);
  } catch {
    // ignore
  }
  return undefined;
}

const fetchSynonyms = async (word: string): Promise<SynonymResponse> => {
  const url = `/api/lookup?${toSearchParams({ word })}`;
  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded. Please wait a moment.");
    if (res.status === 402) {
      const msg = (await readErrorMessage(res)) || 'Cerebras returned 402 (payment required). Please check billing/quota.';
      throw new Error(msg);
    }
    if (res.status === 500) {
      const msg = (await readErrorMessage(res)) || "Failed to parse dictionary data. Please try again.";
      throw new Error(msg);
    }
    const msg = (await readErrorMessage(res)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Server validates and normalizes the response shape already; keep the client lightweight.
  return (await res.json()) as SynonymResponse;
};

export function useSynonymFetch(word: string | null) {
  return useQuery({
    queryKey: ['lookup', word],
    queryFn: () => fetchSynonyms(word!),
    enabled: !!word,
    // Synonym data is fairly static, but keep cache bounded to avoid unbounded local growth.
    staleTime: 1000 * 60 * 60 * 24, // 24h
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7d
    retry: (failureCount, error) => {
      if (error.message.includes("Rate limit")) return false; // Don't retry rate limits automatically
      return failureCount < 2;
    },
  });
}
