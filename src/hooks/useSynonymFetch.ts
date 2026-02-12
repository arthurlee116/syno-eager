import { useQuery } from '@tanstack/react-query';
import { lookupSynonyms } from '@/lib/lookupApi';

export function useSynonymFetch(word: string | null) {
  return useQuery({
    queryKey: ['lookup', word],
    queryFn: () => lookupSynonyms(word!),
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
