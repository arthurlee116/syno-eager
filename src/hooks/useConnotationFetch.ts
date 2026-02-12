import { useQuery } from "@tanstack/react-query";
import { type ConnotationParams, lookupConnotation } from "@/lib/lookupApi";

export function useConnotationFetch(params: ConnotationParams | null, enabled: boolean) {
  return useQuery({
    queryKey: [
      "connotation",
      params?.headword,
      params?.synonym,
      params?.partOfSpeech,
    params?.definition,
    ],
    queryFn: () => lookupConnotation(params!),
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
