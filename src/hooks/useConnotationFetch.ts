import { useQuery } from "@tanstack/react-query";
import { type ConnotationResponse } from "@/lib/types";

type ConnotationParams = {
  headword: string;
  synonym: string;
  partOfSpeech: string;
  definition: string;
};

function toSearchParams(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, v);
  return sp.toString();
}

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const data: unknown = await res.clone().json();
    if (data && typeof data === "object") {
      const err = (data as Record<string, unknown>).error;
      if (typeof err === "string" && err.trim()) return err.trim();
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

async function fetchConnotation(params: ConnotationParams): Promise<ConnotationResponse> {
  const url = `/api/connotation?${toSearchParams({
    headword: params.headword,
    synonym: params.synonym,
    partOfSpeech: params.partOfSpeech,
    definition: params.definition,
  })}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded. Please wait a moment.");
    if (res.status === 402) {
      const msg =
        (await readErrorMessage(res)) ||
        "Upstream returned 402 (payment required). Please check billing/quota.";
      throw new Error(msg);
    }
    if (res.status === 500) {
      const msg = (await readErrorMessage(res)) || "Failed to fetch connotation. Please try again.";
      throw new Error(msg);
    }
    const msg = (await readErrorMessage(res)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (await res.json()) as ConnotationResponse;
}

export function useConnotationFetch(params: ConnotationParams | null, enabled: boolean) {
  return useQuery({
    queryKey: [
      "connotation",
      params?.headword,
      params?.synonym,
      params?.partOfSpeech,
      params?.definition,
    ],
    queryFn: () => fetchConnotation(params!),
    enabled: enabled && !!params,
    // Keep under the 32-bit setTimeout limit (~24.8d) to avoid clamping warnings.
    staleTime: 1000 * 60 * 60 * 24 * 21, // 21d (connotations change rarely)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7d
    retry: (failureCount, error) => {
      if (error.message.includes("Rate limit")) return false;
      return failureCount < 1;
    },
  });
}
