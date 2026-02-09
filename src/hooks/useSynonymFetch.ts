import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { type SynonymResponse, SynonymResponseSchema } from '@/lib/types';
import { toast } from 'sonner';

const fetchSynonyms = async (word: string): Promise<SynonymResponse> => {
  try {
    const response = await axios.get<SynonymResponse>(`/api/lookup`, {
      params: { word },
    });
    return SynonymResponseSchema.parse(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }
      if (error.response?.status === 402) {
        const data: unknown = error.response.data;
        let msg = 'Cerebras returned 402 (payment required). Please check billing/quota.';
        if (data && typeof data === 'object') {
          const errField = (data as Record<string, unknown>).error;
          if (typeof errField === 'string') msg = errField;
        }
        throw new Error(msg);
      }
      if (error.response?.status === 500) {
        const data = error.response.data as { error?: string } | undefined;
        const msg = data?.error || "Failed to parse dictionary data. Please try again.";
        throw new Error(msg);
      }
    }
    throw error;
  }
};

export function useSynonymFetch(word: string | null) {
  return useQuery({
    queryKey: ['lookup', word],
    queryFn: () => fetchSynonyms(word!),
    enabled: !!word,
    staleTime: Infinity, // Data is effectively static
    gcTime: Infinity, // Keep in cache
    retry: (failureCount, error) => {
      if (error.message.includes("Rate limit")) return false; // Don't retry rate limits automatically
      return failureCount < 2;
    },
    meta: {
      onError: (err: Error) => {
        toast.error(err.message);
      }
    }
  });
}
